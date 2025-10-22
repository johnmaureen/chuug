/**
 * Mini Add-to-Cart Modal
 *
 * Modular, accessible modal component for product personalization.
 * Designed for future Shopify cart/product integration.
 *
 * Features:
 * - Semantic HTML5 and ARIA compliance
 * - Modular architecture with clear separation of concerns
 * - Event-driven communication
 * - Future-ready integration points
 * - Performance optimized
 */

(function () {
	"use strict";

	// ============================================
	// CONSTANTS AND CONFIGURATION
	// ============================================

	const CONFIG = {
		STORAGE_KEY: "chuug_mini_atc_selections",
		DEBOUNCE_DELAY: 300,
		ANIMATION_DURATION: 500,
		REVERSE_CART_ORDER: false, // Toggle to render cart items in reverse order (newest first)
		SWIPER_CONFIG: {
			loop: false,
			speed: 300,
			effect: "slide",
			touchRatio: 1,
			touchAngle: 45,
			grabCursor: true,
			keyboard: {
				enabled: true,
				onlyInViewport: true,
			},
			a11y: {
				prevSlideMessage: "Previous product image",
				nextSlideMessage: "Next product image",
			},
		},
	};

	// ============================================
	// UTILITY FUNCTIONS
	// ============================================

	const Utils = {
		debounce(func, delay) {
			let timeoutId;
			return function (...args) {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => func.apply(this, args), delay);
			};
		},

		generateId() {
			return Math.random().toString(36).substr(2, 9);
		},

		formatPrice(cents, currencyCode = null) {
			// Use CurrencyManager if available, otherwise fallback to GBP
			if (window.CurrencyManager) {
				return window.CurrencyManager.formatPrice(cents, currencyCode);
			}
			// Fallback to hardcoded GBP if CurrencyManager not available
			return `£${(cents / 100).toFixed(2)}`;
		},

		sanitizeInput(input) {
			return input
				.replace(/[^A-Za-z]/g, "")
				.toUpperCase()
				.slice(0, 3);
		},

		trapFocus(element) {
			const focusableElements = element.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			const handleTabKey = (e) => {
				if (e.key === "Tab") {
					if (e.shiftKey) {
						if (document.activeElement === firstElement) {
							lastElement.focus();
							e.preventDefault();
						}
					} else {
						if (document.activeElement === lastElement) {
							firstElement.focus();
							e.preventDefault();
						}
					}
				}
			};

			element.addEventListener("keydown", handleTabKey);
			firstElement?.focus();

			return () => {
				element.removeEventListener("keydown", handleTabKey);
			};
		},
	};

	// ============================================
	// STORAGE MANAGER
	// ============================================

	const StorageManager = {
		save(key, data) {
			try {
				localStorage.setItem(key, JSON.stringify(data));
				return true;
			} catch (error) {
				return false;
			}
		},

		load(key) {
			try {
				const data = localStorage.getItem(key);
				return data ? JSON.parse(data) : null;
			} catch (error) {
				return null;
			}
		},

		remove(key) {
			try {
				localStorage.removeItem(key);
				return true;
			} catch (error) {
				return false;
			}
		},
	};

	// ============================================
	// EVENT EMITTER
	// ============================================

	class EventEmitter {
		constructor() {
			this.events = {};
		}

		on(event, callback) {
			if (!this.events[event]) {
				this.events[event] = [];
			}
			this.events[event].push(callback);
		}

		emit(event, data) {
			if (this.events[event]) {
				this.events[event].forEach((callback) => callback(data));
			}
		}

		off(event, callback) {
			if (this.events[event]) {
				this.events[event] = this.events[event].filter((cb) => cb !== callback);
			}
		}
	}

	// ============================================
	// PERSONALIZATION STATE MANAGER
	// ============================================

	class PersonalizationState extends EventEmitter {
		constructor() {
			super();
			this.state = {
				engraving: {
					enabled: true,
					vessels: {},
				},
				mixMatch: {
					enabled: true,
					variants: {},
				},
				extraCups: {
					enabled: false,
					variants: {},
				},
				giftBox: {
					enabled: false,
				},
			};
			this.loadState();
		}

		loadState() {
			const saved = StorageManager.load(CONFIG.STORAGE_KEY);
			if (saved) {
				// Only restore engraving and mixMatch states
				// Gift box and extra cups should always start at their defaults
				if (saved.engraving) {
					this.state.engraving = {
						...this.state.engraving,
						...saved.engraving,
					};
				}
				if (saved.mixMatch) {
					this.state.mixMatch = { ...this.state.mixMatch, ...saved.mixMatch };
				}
				// Explicitly keep giftBox and extraCups at their defaults (don't load from storage)
				"💾 Loaded state (selective):",
					{
						restored: {
							engraving: saved.engraving || null,
							mixMatch: saved.mixMatch || null,
						},
						keptAtDefaults: {
							giftBox: this.state.giftBox,
							extraCups: this.state.extraCups,
						},
						ignoredFromStorage: {
							giftBox: saved.giftBox || null,
							extraCups: saved.extraCups || null,
						},
					};
			}
		}

		saveState() {
			// Only persist engraving and mixMatch selections
			// Gift box and extra cups are per-session decisions
			const stateToPersist = {
				engraving: this.state.engraving,
				mixMatch: this.state.mixMatch,
				// Explicitly exclude giftBox and extraCups from persistence
			};
			StorageManager.save(CONFIG.STORAGE_KEY, stateToPersist);
		}

		updatePersonalization(type, data) {
			this.state[type] = { ...this.state[type], ...data };
			this.saveState();
			this.emit("personalizationChanged", { type, data: this.state[type] });
		}

		updateVariantQuantity(type, variantId, quantity) {
			if (!this.state[type].variants) {
				this.state[type].variants = {};
			}

			this.state[type].variants[variantId] = Math.max(0, quantity);
			this.saveState();
			this.emit("variantChanged", { type, variantId, quantity });
		}

		updateVesselEngraving(vesselId, text) {
			if (!this.state.engraving.vessels) {
				this.state.engraving.vessels = {};
			}
			// Support both old format (string) and new format (object with text and enabled)
			if (typeof this.state.engraving.vessels[vesselId] === "string") {
				// Convert old format to new format
				this.state.engraving.vessels[vesselId] = {
					text: Utils.sanitizeInput(text),
					enabled: true,
				};
			} else if (typeof this.state.engraving.vessels[vesselId] === "object") {
				// Update text, keep enabled state
				this.state.engraving.vessels[vesselId].text = Utils.sanitizeInput(text);
			} else {
				// Initialize new vessel
				this.state.engraving.vessels[vesselId] = {
					text: Utils.sanitizeInput(text),
					enabled: true,
				};
			}
			this.saveState();
			this.emit("vesselChanged", {
				vesselId,
				text: this.state.engraving.vessels[vesselId].text,
				enabled: this.state.engraving.vessels[vesselId].enabled,
			});
		}

		updateVesselEngravingEnabled(vesselId, enabled) {
			if (!this.state.engraving.vessels) {
				this.state.engraving.vessels = {};
			}
			// Support both old format (string) and new format (object)
			if (typeof this.state.engraving.vessels[vesselId] === "string") {
				// Convert old format to new format
				const text = this.state.engraving.vessels[vesselId];
				this.state.engraving.vessels[vesselId] = {
					text: text,
					enabled: enabled,
				};
			} else if (typeof this.state.engraving.vessels[vesselId] === "object") {
				// Update enabled state
				this.state.engraving.vessels[vesselId].enabled = enabled;
			} else {
				// Initialize new vessel
				this.state.engraving.vessels[vesselId] = {
					text: "",
					enabled: enabled,
				};
			}
			this.saveState();
			this.emit("vesselEngravingEnabledChanged", { vesselId, enabled });
		}

		getVesselEngravingEnabled(vesselId) {
			if (
				!this.state.engraving.vessels ||
				!this.state.engraving.vessels[vesselId]
			) {
				return true; // Default to enabled
			}
			const vessel = this.state.engraving.vessels[vesselId];
			if (typeof vessel === "string") {
				return true; // Old format, assume enabled
			}
			return vessel.enabled !== false; // Default to true if not set
		}

		getState() {
			return { ...this.state };
		}

		resetEngraving() {
			// Reset only the engraving vessels (clear all engraving text)
			this.state.engraving = {
				enabled: true, // Keep engraving enabled
				vessels: {}, // Clear all vessel engravings
			};
			this.saveState();

			// Force verification that localStorage was updated
			const verification = StorageManager.load(CONFIG.STORAGE_KEY);
			"🔄 Engraving state reset - verification:",
				{
					engravingVessels: verification?.engraving?.vessels,
					shouldBeEmpty:
						Object.keys(verification?.engraving?.vessels || {}).length === 0,
				};

			this.emit("engravingReset");
			("🔄 Engraving state reset - all vessel engravings cleared");
		}

		reset() {
			this.state = {
				engraving: { enabled: true, vessels: {} },
				mixMatch: { enabled: true, variants: {} },
				extraCups: { enabled: false, variants: {} },
				giftBox: { enabled: false },
			};
			StorageManager.remove(CONFIG.STORAGE_KEY);
			this.emit("stateReset");
		}
	}

	// ============================================
	// SWIPER INTEGRATION
	// ============================================

	class ProductImageSwiper {
		constructor(container, config) {
			this.container = container;
			this.config = { ...CONFIG.SWIPER_CONFIG, ...config };
			this.swiper = null;
			this.init();
		}

		init() {
			if (typeof Swiper !== "undefined") {
				this.createSwiper();
			} else {
				// Wait for Swiper to load (deferred loading)
				this.waitForSwiper();
			}
		}

		waitForSwiper() {
			if (typeof Swiper !== "undefined") {
				this.createSwiper();
			} else {
				// Check again after a short delay
				setTimeout(() => this.waitForSwiper(), 50);
			}
		}

		createSwiper() {
			const paginationEl = this.container.parentElement.querySelector(
				".mini-atc-modal__image-dots"
			);

			this.swiper = new Swiper(this.container, {
				...this.config,
				pagination: {
					el: paginationEl,
					clickable: true,
					bulletClass: "dot",
					bulletActiveClass: "active",
					renderBullet: (index, className) =>
						`<button class="${className}" aria-label="View product image ${
							index + 1
						}" data-slide="${index}"></button>`,
				},
				on: {
					slideChange: () => {
						// Update dots manually to ensure they stay in sync
						this.updateDots();
					},
					init: () => {
						// Ensure dots are properly initialized
						this.updateDots();
						// Setup manual dot navigation
						this.setupDotNavigation();
					},
				},
			});
		}

		setupFallbackNavigation() {
			const dots = this.container.parentElement.querySelectorAll(".dot");
			const slides = this.container.querySelectorAll(".swiper-slide");

			if (!dots.length || !slides.length) return;

			dots.forEach((dot, index) => {
				dot.addEventListener("click", () => {
					this.goToSlide(index);
				});
			});
		}

		setupDotNavigation() {
			// Add click handlers to dots for manual navigation
			const dots = this.container.parentElement.querySelectorAll(".dot");
			dots.forEach((dot, index) => {
				// Remove existing event listeners to prevent duplicates
				dot.replaceWith(dot.cloneNode(true));
			});

			// Re-select dots after cloning
			const newDots = this.container.parentElement.querySelectorAll(".dot");
			newDots.forEach((dot, index) => {
				dot.addEventListener("click", () => {
					this.goToSlide(index);
				});
			});
		}

		goToSlide(index) {
			const slides = this.container.querySelectorAll(".swiper-slide");
			const dots = this.container.parentElement.querySelectorAll(".dot");

			if (this.swiper) {
				this.swiper.slideTo(index);
			} else {
				// Fallback manual slide management
				slides.forEach((slide, i) => {
					slide.style.display = i === index ? "flex" : "none";
				});

				dots.forEach((dot, i) => {
					dot.classList.toggle("active", i === index);
				});
			}
		}

		updateDots() {
			const dots = this.container.parentElement.querySelectorAll(".dot");
			const activeIndex = this.swiper ? this.swiper.activeIndex : 0;

			dots.forEach((dot, index) => {
				dot.classList.toggle("active", index === activeIndex);
			});
		}

		updateProductImage(imageSrc, altText = "CHUUG Vessel") {
			const firstSlide = this.container.querySelector(".swiper-slide img");
			if (firstSlide) {
				firstSlide.src = imageSrc;
				firstSlide.alt = altText;
			}
			this.goToSlide(0);
		}

		destroy() {
			if (this.swiper) {
				this.swiper.destroy(true, true);
			}
		}
	}

	// ============================================
	// COUNTDOWN TIMER - DEPRECATED
	// ============================================
	// Countdown timer is now handled by chuug-unified-countdown.js
	// This ensures synchronization across all countdown displays
	// ============================================

	// ============================================
	// PRICING CALCULATOR
	// ============================================

	class PricingCalculator extends EventEmitter {
		constructor(modalInstance) {
			super();
			this.modalInstance = modalInstance; // Reference to the modal instance
			this.dynamicPrices = {
				vessel: null, // Will be updated from POMC selectedProductAmountData
				giftBox: null, // Will be updated from product data
			};
		}

		async calculateTotal(state) {
			let total = 0;
			let originalTotal = 0;
			let vesselOnlyTotal = 0;
			let vesselOnlyOriginal = 0;

			// Use static pricing (GraphQL disabled to prevent 403 errors)
			const vesselPricing = this.getVesselPricingForMultiplier();

			if (vesselPricing) {
				vesselOnlyTotal = vesselPricing.price;
				vesselOnlyOriginal = vesselPricing.originalPrice;
				total = vesselPricing.price;
				originalTotal = vesselPricing.originalPrice;
			} else {
				// If no POMC data available, return zero pricing
				return { total: 0, originalPrice: 0, savings: 0 };
			}

			// FORCE GIFT BOX PRICING - This is a direct fix to ensure gift box pricing is always applied
			if (state.giftBox?.enabled) {
				const giftBoxPrice = this.dynamicPrices.giftBox || 200; // Default to £2.00 if not loaded
				const multiplier = window.pomcSystem?.getMultiplier() || 2; // Default to 2 vessels
				const giftBoxTotal = giftBoxPrice * multiplier;
				total += giftBoxTotal;
				originalTotal += giftBoxTotal;
			}

			// Gift box pricing is now handled by the FORCE section above
			// No need to add it again here to avoid double counting
			// When disabled, show vessel prices only

			// Add mix & match variants (if pricing is available)
			if (state.mixMatch?.enabled && state.mixMatch.variants) {
				Object.values(state.mixMatch.variants).forEach((quantity) => {
					// TODO: Get actual variant pricing from product data
					const variantPrice = quantity * 1299; // £12.99 fallback
					total += variantPrice;
				});
			}

			// Add extra cups variants (if pricing is available)
			if (state.extraCups?.enabled && state.extraCups.variants) {
				Object.values(state.extraCups.variants).forEach((quantity) => {
					// TODO: Get actual variant pricing from product data
					const variantPrice = quantity * 1299; // £12.99 fallback
					total += variantPrice;
				});
			}

			// Calculate vessel-only savings (this should not include add-ons)
			const vesselSavings = vesselOnlyOriginal - vesselOnlyTotal;
			const savings = vesselSavings;

			const pricingData = {
				total,
				originalPrice: originalTotal,
				savings,
				formattedTotal: Utils.formatPrice(total),
				formattedOriginal: Utils.formatPrice(originalTotal),
				formattedSavings: Utils.formatPrice(savings),
			};

			this.emit("priceCalculated", pricingData);

			return { total, originalPrice: originalTotal, savings };
		}

		getVesselPricing(selection) {
			// This method is deprecated - use getVesselPricingForMultiplier() instead
			// which gets pricing directly from POMC selectedProductAmountData
			return this.getVesselPricingForMultiplier();
		}

		getVesselPricingForMultiplier() {
			// Get pricing from POMC system - this is the source of truth
			if (window.pomcSystem) {
				const selectedProductAmountData =
					window.pomcSystem.getSelectedProductAmountData();
				if (selectedProductAmountData && selectedProductAmountData.variants) {
					// Use per-vessel pricing calculation
					return this.getPerVesselPricing(selectedProductAmountData);
				}
			}

			// No pricing data available
			return null;
		}

		/**
		 * Calculate pricing for each vessel individually based on its configuration
		 * @param {Object} selectedProductAmountData - Product data with variants
		 * @returns {Object|null} Pricing breakdown with total
		 */
		getPerVesselPricing(selectedProductAmountData) {
			if (!window.pomcSystem) return null;

			const vesselSelections = window.pomcSystem.getAllVesselSelections();
			const multiplier = window.pomcSystem.getMultiplier() || 1;

			// Check if master engraving toggle is on
			const masterEngravingEnabled = this.modalInstance.isEngravingEnabled();

			// Count vessel types
			let charcoalCount = 0;
			let naturalCount = 0;
			let engravingCount = 0;

			for (let i = 1; i <= multiplier; i++) {
				const selection = vesselSelections[i];
				if (selection?.ropeType) {
					if (selection.ropeType.toLowerCase() === "charcoal") {
						charcoalCount++;
					} else {
						naturalCount++;
					}
				}

				// Count vessels with engraving enabled
				if (masterEngravingEnabled && this.getVesselEngravingEnabled(i)) {
					engravingCount++;
				}
			}

			// Determine base variant index based on configuration
			// If all vessels are charcoal, use charcoal base (2), otherwise natural base (0)
			const allCharcoal = charcoalCount === multiplier;
			const baseVariantIndex = allCharcoal ? 2 : 0;
			const baseVariant = selectedProductAmountData.variants[baseVariantIndex];

			if (!baseVariant) {
				return null;
			}

			// Start with appropriate base bundle price
			let totalPrice = baseVariant.price;
			let totalOriginalPrice =
				baseVariant.compare_at_price || baseVariant.price;

			// Add charcoal upgrade charges (only if not all charcoal)
			let charcoalCharges = 0;
			if (charcoalCount > 0 && !allCharcoal) {
				// Get charcoal upgrade price from POMC system (e.g., $4.00 = 400 cents)
				const charcoalUpgradePrice =
					window.pomcSystem?.CHARCOAL_UPGRADE_PRICE || 400;
				charcoalCharges = charcoalUpgradePrice * charcoalCount;
			}

			// Calculate engraving charges
			let engravingCharges = 0;
			if (masterEngravingEnabled && engravingCount > 0) {
				// Get engraving cost per vessel based on the base variant we're using
				const withEngravingIndex = allCharcoal ? 3 : 1;
				const withoutEngravingIndex = allCharcoal ? 2 : 0;

				const withEngraving =
					selectedProductAmountData.variants[withEngravingIndex];
				const withoutEngraving =
					selectedProductAmountData.variants[withoutEngravingIndex];

				if (withEngraving && withoutEngraving) {
					const bundleEngravingDiff =
						withEngraving.price - withoutEngraving.price;
					const perVesselEngravingCost = bundleEngravingDiff / multiplier;
					engravingCharges = perVesselEngravingCost * engravingCount;
				}
			}

			// Log per-vessel breakdown
			for (let i = 1; i <= multiplier; i++) {
				const vesselSelection = vesselSelections[i];
				if (vesselSelection?.ropeType) {
					const vesselEngravingEnabled =
						masterEngravingEnabled && this.getVesselEngravingEnabled(i);
				}
			}

			// Calculate final total
			totalPrice += charcoalCharges + engravingCharges;
			totalOriginalPrice += charcoalCharges + engravingCharges;

			// Store the pricing for reference
			this.dynamicPrices.vessel = {
				price: totalPrice,
				originalPrice: totalOriginalPrice,
			};

			return {
				price: totalPrice,
				originalPrice: totalOriginalPrice,
			};
		}

		/**
		 * Get vessel-specific engraving enabled state
		 * @param {number} vesselId - Vessel ID (1, 2, or 3)
		 * @returns {boolean} Whether engraving is enabled for this vessel
		 */
		getVesselEngravingEnabled(vesselId) {
			// First check if master engraving toggle is disabled
			if (!this.modalInstance) {
				return true; // Default to enabled if no modal instance
			}

			const masterEngravingEnabled = this.modalInstance.isEngravingEnabled();
			if (!masterEngravingEnabled) {
				return false; // Master toggle overrides all vessel toggles
			}

			// Check vessel-specific toggle state from PersonalizationState
			if (this.modalInstance.state) {
				return this.modalInstance.state.getVesselEngravingEnabled(vesselId);
			}

			return true; // Default to enabled
		}

		/**
		 * Calculate pricing for mixed vessel configurations (some charcoal, some natural)
		 * For mixed configs, we use the charcoal rope variant pricing as the base,
		 * since it represents the higher-value configuration
		 */
		getMixedVesselPricing(selectedProductAmountData, engravingEnabled) {
			("🪢 Calculating mixed vessel pricing");

			const vesselSelections = window.pomcSystem.getAllVesselSelections();
			const multiplier = window.pomcSystem.getMultiplier() || 1;

			// Count charcoal vs natural vessels
			let charcoalCount = 0;
			let naturalCount = 0;

			for (let i = 1; i <= multiplier; i++) {
				const selection = vesselSelections[i];
				if (selection?.ropeType) {
					if (selection.ropeType.toLowerCase() === "charcoal") {
						charcoalCount++;
					} else {
						naturalCount++;
					}
				}
			}

			`🪢 Vessel breakdown: ${charcoalCount} charcoal, ${naturalCount} natural`;

			// For mixed configurations, use the charcoal rope variant pricing as the base
			// This ensures we get the higher pricing that includes charcoal upgrade costs
			const charcoalVariantIndex = engravingEnabled ? 3 : 2;
			const variant = selectedProductAmountData.variants[charcoalVariantIndex];

			if (variant) {
				// Get charcoal upgrade price from POMC system or use default (299 cents = £2.99)
				const charcoalUpgradePrice =
					window.pomcSystem?.CHARCOAL_UPGRADE_PRICE || 299;

				// Add charcoal upgrade price for each charcoal vessel
				const totalCharcoalUpgradePrice = charcoalUpgradePrice * charcoalCount;

				// Calculate total price: bundle base price + charcoal upgrade costs
				const totalPrice = variant.price + totalCharcoalUpgradePrice;
				const totalOriginalPrice =
					variant.compare_at_price + totalCharcoalUpgradePrice;

				`🪢 Using charcoal rope variant ${charcoalVariantIndex} for mixed bundle pricing`;
				`🪢 Bundle base price: ${variant.price}`;
				`🪢 Charcoal upgrade price per vessel: ${charcoalUpgradePrice}`;
				`🪢 Total charcoal upgrade cost (${charcoalCount} vessels): ${totalCharcoalUpgradePrice}`;
				`🪢 Final total price: ${totalPrice} (${variant.price} + ${totalCharcoalUpgradePrice})`;
				`🪢 Final original price: ${totalOriginalPrice}`;

				// Store the pricing for reference
				this.dynamicPrices.vessel = {
					price: totalPrice,
					originalPrice: totalOriginalPrice,
				};

				return {
					price: totalPrice,
					originalPrice: totalOriginalPrice,
				};
			}

			return null;
		}

		/**
		 * Fetch vessel pricing via GraphQL with current currency
		 * This method provides currency-aware pricing
		 */
		async getVesselPricingViaGraphQL() {
			try {
				if (!window.CurrencyManager) {
					return this.getVesselPricingForMultiplier();
				}

				if (!window.pomcSystem) {
					return null;
				}

				const selectedProductAmountData =
					window.pomcSystem.getSelectedProductAmountData();
				if (!selectedProductAmountData || !selectedProductAmountData.id) {
					return null;
				}

				// Fetch product data via GraphQL
				const productData = await window.CurrencyManager.fetchProductData(
					selectedProductAmountData.id
				);
				if (!productData || !productData.variants) {
					return this.getVesselPricingForMultiplier(); // Fallback
				}

				const engravingEnabled = this.getEngravingState();

				// Check for mixed vessel configuration
				const hasMixedConfig = this.modalInstance.hasMixedVesselConfiguration();
				let variantIndex;

				if (hasMixedConfig) {
					("🪢 Mixed vessel configuration detected in GraphQL pricing");
					// For mixed configurations, use charcoal rope variant pricing
					variantIndex = engravingEnabled ? 3 : 2;
				} else {
					// Standard logic for uniform configuration
					const hasCharcoalRope =
						this.modalInstance.hasAnyCharcoalRopeSelected();
					variantIndex = this.modalInstance.getVariantIndex(
						hasCharcoalRope,
						engravingEnabled
					);
				}

				// Find the correct variant
				const variants = productData.variants.edges.map((edge) => edge.node);
				const variant = variants[variantIndex];

				if (variant && variant.price) {
					// Convert GraphQL price to cents (Shopify returns as decimal string)
					const priceInCents = Math.round(
						parseFloat(variant.price.amount) * 100
					);
					const originalPriceInCents = variant.compareAtPrice
						? Math.round(parseFloat(variant.compareAtPrice.amount) * 100)
						: null;

					// Store the pricing for reference with currency info
					this.dynamicPrices.vessel = {
						price: priceInCents,
						originalPrice: originalPriceInCents,
						currency: variant.price.currencyCode,
					};

					return {
						price: priceInCents,
						originalPrice: originalPriceInCents,
						currency: variant.price.currencyCode,
					};
				}

				// Fallback to static pricing if GraphQL fails
				return this.getVesselPricingForMultiplier();
			} catch (error) {
				// Fallback to static pricing
				return this.getVesselPricingForMultiplier();
			}
		}

		updateGiftBoxPrice(priceInCents) {
			this.dynamicPrices.giftBox = priceInCents;
		}

		getEngravingState() {
			// Default to false if no modal instance
			if (!this.modalInstance) {
				return false;
			}

			// Use the modal instance's method
			return this.modalInstance.isEngravingEnabled();
		}
	}

	// ============================================
	// MAIN MODAL CONTROLLER
	// ============================================

	class MiniATCModal extends EventEmitter {
		constructor(modalElement) {
			super();
			this.modal = modalElement;
			this.config = this.loadConfig();
			this.isActive = false;
			this.currentView = "personalize";
			this.focusTrap = null;
			this.openingContext = null; // Track how modal was opened: 'cart-icon' or 'add-multiple-products'

			// Initialize components
			this.state = new PersonalizationState();
			this.pricing = new PricingCalculator(this); // Pass modal instance to pricing calculator
			this.swiper = null;
			this.countdown = null;

			this.init();
		}

		loadConfig() {
			const configScript = document.querySelector(
				`[data-mini-atc-config="${this.modal.id}"]`
			);
			if (configScript) {
				try {
					return JSON.parse(configScript.textContent);
				} catch (error) {}
			}
			return {};
		}

		init() {
			this.bindEvents();
			this.initializeComponents();
			this.setupAccessibility();
			this.initializeGiftBoxPricing();
			this.addModalTransitionStyles();
		}

		bindEvents() {
			// Modal open/close events
			this.modal.addEventListener("click", this.handleModalClick.bind(this));

			// Keyboard events
			document.addEventListener("keydown", this.handleKeydown.bind(this));

			// Toggle events
			this.modal.addEventListener("change", (event) => {
				this.handleToggleChange(event);
			});

			// Counter events
			this.modal.addEventListener("click", this.handleCounterClick.bind(this));

			// Remove item events (for dynamically added checkout items)
			this.modal.addEventListener("click", (event) => {
				const removeBtn = event.target.closest("[data-remove-item]");
				if (removeBtn) {
					// Prevent duplicate removal attempts
					if (this.isRemovingItem) {
						event.preventDefault();
						event.stopPropagation();
						return;
					}

					const itemId = removeBtn.getAttribute("data-remove-item");
					`🖱️ CLICK: Delete button clicked for item ${itemId}`;
					event.preventDefault();
					event.stopPropagation();
					this.removeCartItem(itemId);
				}
			});

			// Input events
			this.modal.addEventListener("input", this.handleVesselInput.bind(this));
			this.modal.addEventListener("keypress", (event) => {
				if (event.target.closest("[data-vessel-input]")) {
					this.handleVesselKeyPress(event);
				}
			});
			this.modal.addEventListener("paste", (event) => {
				if (event.target.closest("[data-vessel-input]")) {
					this.handleVesselPaste(event);
				}
			});

			// State change events
			this.state.on(
				"personalizationChanged",
				this.handlePersonalizationChange.bind(this)
			);
			this.state.on("variantChanged", this.handleVariantChange.bind(this));
			this.state.on("vesselChanged", this.handleVesselChange.bind(this));

			// Pricing events
			this.pricing.on("priceCalculated", this.updatePricingDisplay.bind(this));

			// Listen for POMC system changes to update pricing
			this.setupPOMCIntegration();
		}

		initializeComponents() {
			// Initialize Swiper
			const swiperContainer = this.modal.querySelector(
				".mini-atc-product-swiper"
			);
			if (swiperContainer) {
				this.swiper = new ProductImageSwiper(swiperContainer);
			}

			// Initialize countdown timer - DISABLED to prevent conflict with Liquid countdown script
			// const countdownElement = this.modal.querySelector(
			// 	".countdown-timer__time"
			// );
			// if (countdownElement) {
			// 	this.countdown = new CountdownTimer(countdownElement);
			// }

			// Initialize vessel inputs based on toggle states
			this.initializeVesselInputs();

			// Initial pricing calculation
			this.calculatePricing().catch(() => {});
		}

		setupAccessibility() {
			// Ensure proper ARIA attributes
			this.modal.setAttribute("aria-hidden", "true");

			// Set up focus management
			const closeButton = this.modal.querySelector("[data-modal-close]");
			if (closeButton) {
				closeButton.setAttribute(
					"aria-label",
					closeButton.getAttribute("aria-label") || "Close modal"
				);

				// Add direct event listener as backup
				closeButton.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					this.close();
				});
			}
		}

		addModalTransitionStyles() {
			// Add smooth transition styles to prevent HTML flash
			if (!document.querySelector("#mini-atc-modal-transitions")) {
				const style = document.createElement("style");
				style.id = "mini-atc-modal-transitions";
				style.textContent = `
					.mini-atc-modal {
						opacity: 0;
						visibility: hidden;
						transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
					}
					
					.mini-atc-modal--active {
						opacity: 1;
						visibility: visible;
					}
					
					.mini-atc-modal__container {
						transform: translateY(20px);
						transition: transform 0.2s ease-in-out;
					}
					
					.mini-atc-modal--active .mini-atc-modal__container {
						transform: translateY(0);
					}
					
					/* Prevent content flash during transitions */
					.mini-atc-modal:not(.mini-atc-modal--active) .mini-atc-modal__content {
						opacity: 0;
					}
					
					.mini-atc-modal--active .mini-atc-modal__content {
						opacity: 1;
						transition: opacity 0.1s ease-in-out 0.1s;
					}
					
					/* Smooth transitions for checkout sections */
					.step-process-section,
					.countdown-section,
					.additional-recommendations-section,
					.mini-atc-modal__footer {
						transition: opacity 0.15s ease-in-out;
					}
				`;
				document.head.appendChild(style);
			}
		}

		initializeVesselInputs() {
			// Find all vessel toggles and sync their corresponding inputs
			const vesselToggles = this.modal.querySelectorAll("[data-vessel-toggle]");

			vesselToggles.forEach((toggle) => {
				const vesselId = toggle.getAttribute("data-vessel-toggle");
				const input = toggle
					.closest(".vessel-personalization-row")
					?.querySelector(".vessel-name-input");

				// Restore vessel toggle state from saved state
				if (this.state) {
					const vesselEngravingEnabled =
						this.state.getVesselEngravingEnabled(vesselId);
					toggle.checked = vesselEngravingEnabled;
				}

				if (input) {
					// Enable/disable input based on toggle state
					input.disabled = !toggle.checked;

					// If toggle is checked, ensure input is enabled
					if (toggle.checked) {
						input.removeAttribute("disabled");
					}
				}
			});
		}

		handleModalClick(event) {
			// Handle overlay clicks
			if (event.target.classList.contains("mini-atc-modal__overlay")) {
				this.close();
				return;
			}

			// Handle close button clicks
			const closeButton = event.target.closest("[data-modal-close]");
			if (closeButton) {
				event.preventDefault();
				event.stopPropagation();
				this.close();
				return;
			}

			// Handle action button clicks
			const action = event.target.closest("[data-modal-action]");
			if (action) {
				const actionType = action.getAttribute("data-modal-action");
				this.handleAction(actionType);
			}
		}

		handleKeydown(event) {
			if (!this.isActive) return;

			if (event.key === "Escape") {
				this.close();
			}
		}

		handleToggleChange(event) {
			const toggle = event.target.closest(
				"[data-personalization-toggle], [data-addon-toggle], [data-vessel-toggle], [data-gift-box-variant-id]"
			);
			if (!toggle) return;

			"🔄 Toggle changed:",
				{
					element: toggle,
					checked: toggle.checked,
					hasPersonalizationToggle: toggle.hasAttribute(
						"data-personalization-toggle"
					),
					hasAddonToggle: toggle.hasAttribute("data-addon-toggle"),
					hasVesselToggle: toggle.hasAttribute("data-vessel-toggle"),
					hasGiftBoxVariantId: toggle.hasAttribute("data-gift-box-variant-id"),
				};

			if (toggle.hasAttribute("data-personalization-toggle")) {
				const type = toggle.getAttribute("data-personalization-toggle");
				"🔄 Updating personalization:", type, "enabled:", toggle.checked;
				this.state.updatePersonalization(type, { enabled: toggle.checked });
			} else if (toggle.hasAttribute("data-addon-toggle")) {
				const type = toggle.getAttribute("data-addon-toggle");
				"🔄 Addon toggle:", type, "enabled:", toggle.checked;
				// Handle gift box toggle specifically with correct key
				if (type === "gift-box") {
					"🎁 Gift box toggle changed to:", toggle.checked;
					this.state.updatePersonalization("giftBox", {
						enabled: toggle.checked,
					});
					"🎁 Gift box state after update:", this.state.state.giftBox;
				} else {
					this.state.updatePersonalization(type, { enabled: toggle.checked });
				}
			} else if (toggle.hasAttribute("data-vessel-toggle")) {
				const vesselId = toggle.getAttribute("data-vessel-toggle");
				const input = toggle
					.closest(".vessel-personalization-row")
					.querySelector(".vessel-name-input");
				if (input) {
					input.disabled = !toggle.checked;
					if (!toggle.checked) {
						input.value = "";
						this.state.updateVesselEngraving(vesselId, "");
					}
				}
				// Update the vessel-specific engraving enabled state
				this.state.updateVesselEngravingEnabled(vesselId, toggle.checked);
			}

			this.toggleOptionsVisibility(toggle);

			// Recalculate pricing when any toggle changes
			this.calculatePricing().catch(() => {});
		}

		handleCounterClick(event) {
			const counterBtn = event.target.closest("[data-variant-action]");
			if (!counterBtn) return;

			const action = counterBtn.getAttribute("data-variant-action");
			const variantId = counterBtn.getAttribute("data-variant-id");
			const counter = counterBtn.closest(".mini-atc-modal__counter");
			const valueEl = counter.querySelector("[data-variant-quantity]");

			if (!valueEl || !variantId) return;

			let currentValue = parseInt(valueEl.textContent) || 0;

			if (action === "increment") {
				currentValue = Math.min(currentValue + 1, 99);
			} else if (action === "decrement") {
				currentValue = Math.max(currentValue - 1, 0);
			}

			valueEl.textContent = currentValue;

			// Visual feedback
			valueEl.style.transform = "scale(1.1)";
			setTimeout(() => {
				valueEl.style.transform = "scale(1)";
			}, 150);

			// Update variant price
			this.updateVariantPrice(counter, currentValue);

			// Determine personalization type
			const personalizationEl = counterBtn.closest("[data-personalization]");
			let type =
				personalizationEl?.getAttribute("data-personalization") || "mixMatch";

			// Convert kebab-case to camelCase for state consistency
			if (type === "mix-match") {
				type = "mixMatch";
			} else if (type === "extra-cups") {
				type = "extraCups";
			}

			this.state.updateVariantQuantity(type, variantId, currentValue);
		}

		handleVesselInput(event) {
			const input = event.target.closest("[data-vessel-input]");
			if (!input) return;

			const vesselId = input.getAttribute("data-vessel-input");
			const sanitizedValue = Utils.sanitizeInput(input.value);

			if (input.value !== sanitizedValue) {
				input.value = sanitizedValue;
			}

			this.state.updateVesselEngraving(vesselId, sanitizedValue);
		}

		handleVesselKeyPress(event) {
			// Only allow letters (A-Z, a-z)
			const char = String.fromCharCode(event.which);
			if (!/[A-Za-z]/.test(char)) {
				event.preventDefault();
			}
		}

		handleVesselPaste(event) {
			// Prevent default paste behavior
			event.preventDefault();

			// Get pasted text from clipboard
			const paste = (event.clipboardData || window.clipboardData).getData(
				"text"
			);

			// Sanitize the pasted content to only allow letters
			const sanitizedPaste = Utils.sanitizeInput(paste);

			// Set the sanitized value to the input
			const input = event.target;
			input.value = sanitizedPaste;

			// Trigger input event to update state
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}

		handleAction(actionType) {
			switch (actionType) {
				case "add-to-cart":
					this.addToCart();
					break;
				case "back-to-personalize":
					this.switchView("personalize");
					break;
				case "proceed-to-checkout":
					this.proceedToCheckout();
					break;
				case "close-modal":
					this.close();
					break;
				default:
			}
		}

		handlePersonalizationChange(data) {
			this.calculatePricing().catch(() => {});
			this.emit("personalizationChanged", data);
		}

		handleVariantChange(data) {
			this.calculatePricing().catch(() => {});
			this.emit("variantChanged", data);
		}

		handleVesselChange(data) {
			// Update product image if needed
			this.updateProductImageFromSelection();
			this.emit("vesselChanged", data);
		}

		toggleOptionsVisibility(toggle) {
			// Don't hide complete options for vessel personalization toggles
			// These toggles should only enable/disable individual vessel input fields
			if (toggle.hasAttribute("data-vessel-toggle")) {
				return;
			}

			const personalizationEl = toggle.closest(
				".mini-atc-modal__personalization"
			);
			const optionsEl = personalizationEl?.querySelector(
				"[data-personalization-content], .mini-atc-modal__complete-options"
			);

			if (optionsEl) {
				if (toggle.checked) {
					optionsEl.classList.remove(
						"mini-atc-modal__complete-options--hidden"
					);
				} else {
					optionsEl.classList.add("mini-atc-modal__complete-options--hidden");
				}
			}
		}

		updateVariantPrice(counter, quantity) {
			const priceEl = counter.parentElement.querySelector(
				"[data-variant-price]"
			);
			const basePrice =
				parseInt(priceEl?.getAttribute("data-base-price")) || 1299;

			if (priceEl) {
				const totalPrice = quantity * basePrice;
				priceEl.textContent = Utils.formatPrice(totalPrice);
			}
		}

		updateProductImageFromSelection() {
			// Future integration point for dynamic product images
			// Based on vessel personalization selections
			const state = this.state.getState();

			// Placeholder for dynamic image update logic
			if (this.swiper && state.engraving?.vessels) {
				// This would integrate with actual product image variants
			}
		}

		updateVesselPersonalizationRows() {
			// Get vessel count from POMC system
			if (!window.pomcSystem) {
				return;
			}

			const vesselCount = window.pomcSystem.getMultiplier() || 2;

			// Find the vessel personalization container
			const vesselContainer = this.modal.querySelector(
				".modal__personalization-vessel-name-wrap"
			);
			if (!vesselContainer) {
				return;
			}

			// Store existing vessel values before removing rows
			const existingRows = vesselContainer.querySelectorAll(
				".vessel-personalization-row"
			);
			const existingValues = {};
			existingRows.forEach((row) => {
				const vesselId = row.getAttribute("data-vessel");
				const input = row.querySelector("[data-vessel-input]");
				if (input && input.value) {
					existingValues[vesselId] = input.value;
				}
			});

			// Remove existing vessel rows
			existingRows.forEach((row) => row.remove());

			// Create new vessel rows based on vessel count
			for (let i = 1; i <= vesselCount; i++) {
				const vesselRow = this.createVesselPersonalizationRow(i);
				vesselContainer.appendChild(vesselRow);

				// Restore previous value if it existed
				if (existingValues[i]) {
					const input = vesselRow.querySelector("[data-vessel-input]");
					if (input) {
						input.value = existingValues[i];
					}
				}
			}

			// CRITICAL FIX: After recreating rows, sync the engraving content visibility with toggle state
			this.syncEngravingContentVisibility();
		}

		syncEngravingContentVisibility() {
			// Get the engraving toggle element
			const engravingToggle = this.modal.querySelector(
				'[data-personalization-toggle="engraving"]'
			);

			if (!engravingToggle) {
				return;
			}

			// If not in "add-multiple-products" context, restore toggle state from personalization state
			if (this.openingContext !== "add-multiple-products" && this.state) {
				const state = this.state.getState();
				if (state.engraving && typeof state.engraving.enabled === "boolean") {
					engravingToggle.checked = state.engraving.enabled;
				}
			}

			// Find the engraving content container
			const engravingPersonalization = engravingToggle.closest(
				".mini-atc-modal__personalization"
			);
			const engravingContent = engravingPersonalization?.querySelector(
				"[data-personalization-content='engraving'], .mini-atc-modal__complete-options"
			);

			if (!engravingContent) {
				return;
			}

			// Sync the content visibility with the toggle state
			if (engravingToggle.checked) {
				engravingContent.classList.remove(
					"mini-atc-modal__complete-options--hidden"
				);
			} else {
				engravingContent.classList.add(
					"mini-atc-modal__complete-options--hidden"
				);
			}
		}

		createVesselPersonalizationRow(vesselNumber) {
			const modalId = this.modal.id;
			const row = document.createElement("div");
			row.className = "vessel-personalization-row";
			row.setAttribute("data-vessel", vesselNumber);

			row.innerHTML = `
        <div class="vessel-info">
          <span class="vessel-label">Vessel #${vesselNumber}</span>
          <div class="mini-atc-modal__toggle-container">
            <label class="mini-atc-modal__toggle" for="${modalId}-vessel-${vesselNumber}-toggle">
              <input 
                type="checkbox" 
                id="${modalId}-vessel-${vesselNumber}-toggle" 
                checked
                data-vessel-toggle="${vesselNumber}"
                aria-describedby="${modalId}-vessel-${vesselNumber}-description"
              >
              <span class="mini-atc-modal__toggle-slider" aria-hidden="true"></span>
              <span class="visually-hidden">Enable personalization for vessel ${vesselNumber}</span>
            </label>
          </div>
        </div>
        
        <div class="vessel-input-container">
          <label for="${modalId}-vessel-${vesselNumber}-name" class="visually-hidden">
            Personalization text for vessel ${vesselNumber}
          </label>
          <input 
            type="text" 
            id="${modalId}-vessel-${vesselNumber}-name" 
            class="vessel-name-input" 
            placeholder="Enter Initial"
          maxlength="1"
          pattern="[A-Za-z]{0,1}"
          
          data-vessel-input="${vesselNumber}"
          data-property="properties[_Vessel ${vesselNumber} Engraving]"
          aria-describedby="${modalId}-vessel-${vesselNumber}-description"
        >
        </div>
        
        <div id="${modalId}-vessel-${vesselNumber}-description" class="visually-hidden">
          Enter 1 letter for vessel ${vesselNumber} engraving
        </div>
      `;

			return row;
		}

		async fetchVesselSelectionsAndUpdateImages() {
			try {
				// Show loading state
				this.showImageLoader();
				// Get vessel selections from POMC system
				if (!window.pomcSystem) {
					this.hideImageLoader();
					return;
				}
				const allVesselSelections = window.pomcSystem.getAllVesselSelections();

				// Extract product handles from vessel selections
				const productHandles = [];
				Object.values(allVesselSelections).forEach((selection, index) => {
					if (selection.productHandle) {
						productHandles.push(selection.productHandle);
					}
				});

				if (productHandles.length === 0) {
					this.hideImageLoader();
					return;
				}

				// Fetch product data for each product handle
				const productPromises = productHandles.map((productHandle) =>
					this.fetchProductDataByHandle(productHandle)
				);

				const products = await Promise.all(productPromises);
				const validProducts = products.filter((product) => product !== null);

				// Update the product image slider with the first image from each product
				this.updateProductImageSlider(validProducts);

				// Hide loading state
				this.hideImageLoader();
			} catch (error) {
				this.hideImageLoader();
			}
		}

		async fetchProductDataFromVariant(variantId) {
			try {
				// First, get the variant data to find the product ID
				const variantResponse = await fetch(`/variants/${variantId}.js`);
				if (!variantResponse.ok) {
					throw new Error(
						`Failed to fetch variant ${variantId}: ${variantResponse.status}`
					);
				}

				const variantData = await variantResponse.json();

				// Try different possible property names for product ID
				const productId =
					variantData.product_id ||
					variantData.productId ||
					variantData.product?.id;

				if (!productId) {
					return null;
				}

				// Now get the product data using the product ID from the variant
				const productResponse = await fetch(`/products/${productId}.js`);
				if (!productResponse.ok) {
					throw new Error(
						`Failed to fetch product ${productId}: ${productResponse.status}`
					);
				}

				const productData = await productResponse.json();
				return productData;
			} catch (error) {
				return null;
			}
		}

		async fetchProductDataByHandle(productHandle) {
			try {
				const response = await fetch(`/products/${productHandle}.js`);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch product ${productHandle}: ${response.status}`
					);
				}

				const productData = await response.json();
				return productData;
			} catch (error) {
				return null;
			}
		}

		async fetchProductData(productId) {
			try {
				const response = await fetch(`/products.json?ids=${productId}`);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch product ${productId}: ${response.status}`
					);
				}

				const data = await response.json();

				if (data.products && data.products.length > 0) {
					// Find the specific product by ID
					const targetProduct = data.products.find(
						(product) => product.id.toString() === productId.toString()
					);

					if (targetProduct) {
						return targetProduct;
					} else {
						return null;
					}
				} else {
					throw new Error(`Product ${productId} not found`);
				}
			} catch (error) {
				return null;
			}
		}

		async fetchProductViaStorefrontAPI(productId) {
			try {
				// Convert numeric product ID to Shopify Global ID format
				const globalId = `gid://shopify/Product/${productId}`;

				const query = `
          query getProduct($id: ID!) {
            product(id: $id) {
              id
              title
              handle
              description
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        `;

				const response = await fetch("/api/2023-10/graphql.json", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Shopify-Storefront-Access-Token":
							window.Shopify?.storefrontAccessToken || "",
					},
					body: JSON.stringify({
						query: query,
						variables: { id: globalId },
					}),
				});

				if (!response.ok) {
					return null;
				}

				const data = await response.json();

				if (data.errors) {
					return null;
				}

				if (data.data?.product) {
					const product = data.data.product;

					// Transform to match expected format
					const transformedProduct = {
						id: product.id.replace("gid://shopify/Product/", ""),
						title: product.title,
						handle: product.handle,
						description: product.description,
						images: product.images.edges.map((edge) => ({
							src: edge.node.url,
							alt: edge.node.altText,
							width: edge.node.width,
							height: edge.node.height,
						})),
						variants: product.variants.edges.map((edge) => ({
							id: edge.node.id.replace("gid://shopify/ProductVariant/", ""),
							title: edge.node.title,
							price: edge.node.price.amount,
							currency: edge.node.price.currencyCode,
							available: edge.node.availableForSale,
						})),
					};

					return transformedProduct;
				}

				return null;
			} catch (error) {
				return null;
			}
		}

		updateProductImageSlider(products) {
			const swiperContainer = this.modal.querySelector(
				".mini-atc-product-swiper"
			);
			const swiperWrapper = swiperContainer?.querySelector(".swiper-wrapper");
			const imageDots = this.modal.querySelector(".mini-atc-modal__image-dots");

			if (!swiperWrapper || !imageDots) {
				return;
			}

			// Clear all existing slides and dots
			swiperWrapper.innerHTML = "";
			imageDots.innerHTML = "";

			// Add slides and dots for each product
			products.forEach((product, index) => {
				if (product.images && product.images.length > 0) {
					// Get the main/featured image (first image is typically the main image)
					const mainImage = product.images[0];
					const imageUrl = mainImage.src || mainImage;

					// Create new slide
					const newSlide = document.createElement("div");
					newSlide.className = "swiper-slide";
					newSlide.setAttribute("data-image-type", "selection");

					newSlide.innerHTML = `
            <div class="product-image-wrap">
              <div class="img-wrap">
                <img 
                  src="${imageUrl}" 
                  alt="${product.title || `Product ${index + 1}`}" 
                  width="400" 
                  height="400"
                  data-selection-image
                />
              </div>
            </div>
          `;

					swiperWrapper.appendChild(newSlide);

					// Create new dot
					const newDot = document.createElement("button");
					newDot.className = index === 0 ? "dot active" : "dot";
					newDot.setAttribute("data-slide", index);
					newDot.setAttribute("aria-label", `View product image ${index + 1}`);

					imageDots.appendChild(newDot);
				}
			});

			// Re-initialize swiper if it exists, or create new one
			if (this.swiper) {
				// Destroy existing swiper
				if (this.swiper.swiper) {
					this.swiper.swiper.destroy(true, true);
				}
				// Re-initialize the ProductImageSwiper
				this.swiper = new ProductImageSwiper(swiperContainer);
			} else {
				// Create new swiper if it doesn't exist
				this.swiper = new ProductImageSwiper(swiperContainer);
			}
		}

		showImageLoader() {
			const swiperContainer = this.modal.querySelector(
				".mini-atc-product-swiper"
			);
			const swiperWrapper = swiperContainer?.querySelector(".swiper-wrapper");

			if (!swiperWrapper) return;

			// Create or show loading overlay
			let loader = swiperContainer.querySelector(".image-loader");
			if (!loader) {
				loader = document.createElement("div");
				loader.className = "image-loader";
				loader.innerHTML = `
          <div class="loader-content">
            <div class="loader-spinner"></div>
          </div>
        `;
				swiperContainer.appendChild(loader);
			}

			// Add loading styles if not already present
			if (!document.querySelector("#mini-atc-loader-styles")) {
				const style = document.createElement("style");
				style.id = "mini-atc-loader-styles";
				style.textContent = `
          .image-loader {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            border-radius: 8px;
          }
          
          .loader-content {
            text-align: center;
            color: #333;
          }
          
          .loader-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0D2026;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
            display:block !important;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
				document.head.appendChild(style);
			}

			loader.style.display = "flex";
		}

		hideImageLoader() {
			const swiperContainer = this.modal.querySelector(
				".mini-atc-product-swiper"
			);
			const loader = swiperContainer?.querySelector(".image-loader");

			if (loader) {
				loader.style.display = "none";
			}
		}

		async calculatePricing() {
			("🔍 calculatePricing called");
			const state = this.state.getState();
			await this.pricing.calculateTotal(state);
		}

		setupPOMCIntegration() {
			// Listen for POMC system changes and update pricing
			"🔍 Setting up POMC integration, pomcSystem exists:", !!window.pomcSystem;

			if (window.pomcSystem) {
				// Create a custom event listener for POMC changes
				const updatePricingFromPOMC = (event) => {
					this.calculatePricing().catch(() => {});
				};

				// Listen for currency changes
				const updatePricingFromCurrencyChange = (event) => {
					"💰 Currency changed in mini ATC modal:", event.detail;
					this.calculatePricing().catch(() => {});

					// Update checkout view prices if checkout view is active
					const checkoutView = this.modal.querySelector(
						".mini-atc-modal__checkout"
					);
					if (
						checkoutView &&
						window.getComputedStyle(checkoutView).display !== "none"
					) {
						this.updateCheckoutItemPrices();
					}
				};

				// Listen for vessel selection changes
				document.addEventListener(
					"pomcVesselSelectionChanged",
					updatePricingFromPOMC
				);
				document.addEventListener(
					"pomcMultiplierChanged",
					updatePricingFromPOMC
				);

				// Listen for currency changes
				document.addEventListener(
					"currencyUpdated",
					updatePricingFromCurrencyChange
				);
				document.addEventListener(
					"pomcProductAmountChanged",
					updatePricingFromPOMC
				);

				// Listen for charcoal upgrade price changes
				document.addEventListener("pomcCharcoalUpgradePrice", (event) => {
					"🪢 Charcoal upgrade price changed, updating pricing:", event.detail;
					// Small delay to ensure POMC system has fully updated
					setTimeout(() => {
						this.calculatePricing().catch(() => {});
					}, 50);
				});

				// Also listen for the modal opening to ensure pricing is current
				this.modal.addEventListener("modalOpened", () => {
					setTimeout(updatePricingFromPOMC, 100); // Small delay to ensure POMC is ready
				});
			} else {
				// POMC system not ready yet, set up event listener anyway for when it becomes available
				("🔍 POMC system not ready, setting up delayed event listener");
				const setupDelayedListener = () => {
					if (window.pomcSystem) {
						("🔍 POMC system now available, setting up charcoal upgrade listener");
						document.addEventListener("pomcCharcoalUpgradePrice", (event) => {
							"🪢 Charcoal upgrade price changed (delayed setup), updating pricing:",
								event.detail;
							setTimeout(() => {
								this.calculatePricing().catch(() => {});
							}, 50);
						});
					} else {
						setTimeout(setupDelayedListener, 100);
					}
				};
				setupDelayedListener();
			}

			// Listen for vessel count changes to update personalization rows
			document.addEventListener("pomcMultiplierChanged", (event) => {
				if (this.isActive) {
					this.updateVesselPersonalizationRows();
				}
			});

			// Listen for storage changes (when POMC data is updated)
			window.addEventListener("storage", (event) => {
				if (event.key === "chuug_vessel_selections") {
					updatePricingFromPOMC();
				}
			});
		}

		setupEngravingToggleListener() {
			const engravingToggle = this.modal.querySelector(
				'[data-personalization-toggle="engraving"]'
			);

			if (engravingToggle) {
				// Remove any existing listeners to avoid duplicates
				engravingToggle.removeEventListener(
					"change",
					this.handleEngravingToggleChange
				);

				// Add the new listener
				this.handleEngravingToggleChange = async (event) => {
					await this.calculatePricing();
					// Only update cart item compare-at prices if we're in checkout view
					// In personalize view, we don't need to update existing cart items
					const checkoutView = this.modal.querySelector(
						".mini-atc-modal__checkout"
					);
					if (checkoutView && checkoutView.style.display !== "none") {
						await this.updateCartItemCompareAtPrices(event.target.checked);
					}
				};

				engravingToggle.addEventListener(
					"change",
					this.handleEngravingToggleChange
				);
			}
		}

		async updateCartItemCompareAtPrices(engravingEnabled) {
			try {
				// Get current cart data
				const cartData = await this.fetchUpdatedCartData();

				if (!cartData || !cartData.items) {
					return;
				}

				// Get the current multiplier from POMC system
				const multiplier = window.pomcSystem?.getMultiplier() || 1;
				const selectedProductAmountData =
					window.pomcSystem?.getSelectedProductAmountData();

				if (!selectedProductAmountData?.variants) {
					return;
				}

				// Calculate the new per-item compare-at price
				// Check for mixed vessel configuration
				const hasMixedConfig = this.hasMixedVesselConfiguration();
				let variantIndex;

				if (hasMixedConfig) {
					("🛒🪢 Mixed configuration detected for cart update");
					variantIndex = engravingEnabled ? 3 : 2;
				} else {
					const hasCharcoalRope = this.hasAnyCharcoalRopeSelected();
					variantIndex = this.getVariantIndex(
						hasCharcoalRope,
						engravingEnabled
					);
				}

				const variantData = selectedProductAmountData.variants[variantIndex];

				if (!variantData?.compare_at_price) {
					return;
				}

				const perItemCompareAtPrice = Math.round(
					variantData.compare_at_price / multiplier
				);

				// Find and update all vessel items (items with Vessel properties)
				const updates = [];
				for (const item of cartData.items) {
					// Check if this is a vessel item (has Vessel X Product property)
					const isVesselItem =
						item.properties &&
						Object.keys(item.properties).some(
							(key) => key.includes("Vessel") && key.includes("Product")
						);

					if (isVesselItem && item.properties["_Compare At Price"]) {
						// Only update if the compare-at price actually changed
						if (
							item.properties["_Compare At Price"] !== perItemCompareAtPrice
						) {
							updates.push({
								key: item.key,
								properties: {
									...item.properties,
									"_Compare At Price": perItemCompareAtPrice,
								},
							});
						}
					}
				}

				// Perform the updates
				if (updates.length > 0) {
					`📝 Updating compare-at prices for ${updates.length} items to £${(
						perItemCompareAtPrice / 100
					).toFixed(2)}`;

					for (const update of updates) {
						const response = await fetch("/cart/change.js", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								id: update.key,
								properties: update.properties,
								sections: "cart-icon-bubble",
								sections_url: window.location.pathname,
							}),
						});

						// Update cart icon bubble with the last response
						if (update === updates[updates.length - 1]) {
							const cartData = await response.json();
							this.updateCartIconBubble(cartData);
						}
					}

					// Refresh the checkout view to show updated prices
					await this.updateCheckoutView();
				}
			} catch (error) {}
		}

		isEngravingEnabled() {
			// First check the mini ATC modal engraving toggle
			const engravingToggle = this.modal.querySelector(
				'[data-personalization-toggle="engraving"]'
			);
			if (engravingToggle) {
				const toggleEnabled = engravingToggle.checked;
				return toggleEnabled;
			}

			// Fallback to modal state
			const state = this.state.getState();
			const engravingEnabled = state.engraving?.enabled || false;

			// Also check the main product page variant index for consistency
			const inputs = document.querySelectorAll(".inputs");
			if (inputs.length > 0) {
				const variantIndex = parseInt(
					inputs[0].getAttribute("variant_index"),
					10
				);
				const mainPageEngravingEnabled = variantIndex === 1;

				// Use the toggle state as the source of truth if available
				if (engravingToggle) {
					return engravingToggle.checked;
				}

				// Otherwise use the main page state
				return mainPageEngravingEnabled;
			}

			return engravingEnabled;
		}

		hasAnyCharcoalRopeSelected() {
			if (!window.pomcSystem) {
				return false;
			}

			const vesselSelections = window.pomcSystem.getAllVesselSelections();
			const multiplier = window.pomcSystem.getMultiplier() || 1;

			// Check only active vessels (based on multiplier)
			for (let i = 1; i <= multiplier; i++) {
				const selection = vesselSelections[i];
				if (
					selection?.ropeType &&
					selection.ropeType.toLowerCase() === "charcoal"
				) {
					return true;
				}
			}

			return false;
		}

		getVariantIndex(hasCharcoalRope, engravingEnabled) {
			// Variant mapping:
			// 0: Natural, No Engraving
			// 1: Natural, With Engraving
			// 2: Charcoal, No Engraving
			// 3: Charcoal, With Engraving

			const variantIndex = hasCharcoalRope
				? engravingEnabled
					? 3
					: 2
				: engravingEnabled
				? 1
				: 0;

			return variantIndex;
		}

		/**
		 * Check if the current vessel configuration is mixed (some charcoal, some natural)
		 */
		/**
		 * Helper function to get vessel engraving text (handles both old and new format)
		 * @param {string|Object} vesselData - Vessel engraving data (string or {text, enabled})
		 * @returns {string} The engraving text
		 */
		getVesselEngravingText(vesselData) {
			if (!vesselData) return "";
			if (typeof vesselData === "string") return vesselData;
			if (typeof vesselData === "object" && vesselData.text)
				return vesselData.text;
			return "";
		}

		hasMixedVesselConfiguration() {
			if (!window.pomcSystem) {
				return false;
			}

			const vesselSelections = window.pomcSystem.getAllVesselSelections();
			const multiplier = window.pomcSystem.getMultiplier() || 1;

			if (multiplier <= 1) {
				return false; // Can't have mixed with only 1 vessel
			}

			let hasCharcoal = false;
			let hasNatural = false;

			for (let i = 1; i <= multiplier; i++) {
				const selection = vesselSelections[i];
				if (selection?.ropeType) {
					if (selection.ropeType.toLowerCase() === "charcoal") {
						hasCharcoal = true;
					} else {
						hasNatural = true;
					}
				}
			}

			const isMixed = hasCharcoal && hasNatural;
			`🔍 Mixed vessel config check: multiplier=${multiplier}, hasCharcoal=${hasCharcoal}, hasNatural=${hasNatural}, isMixed=${isMixed}`;

			// Mixed if we have both charcoal and natural
			return isMixed;
		}

		/**
		 * Get variant index for a specific vessel based on its rope type
		 */
		getVariantIndexForVessel(vesselSelection, engravingEnabled) {
			const hasCharcoal =
				vesselSelection?.ropeType &&
				vesselSelection.ropeType.toLowerCase() === "charcoal";

			return this.getVariantIndex(hasCharcoal, engravingEnabled);
		}

		async initializeGiftBoxPricing() {
			try {
				const response = await fetch(
					"/products/premium-gift-box-tissue-wrap.js"
				);
				if (response.ok) {
					const productData = await response.json();
					if (productData.variants && productData.variants.length > 0) {
						const variant = productData.variants[0];
						this.pricing.updateGiftBoxPrice(variant.price);
					}
				}
			} catch (error) {}
		}

		async updatePricingDisplay(pricing) {
			("🚀🚀🚀 UPDATEPRICINGDISPLAY METHOD CALLED 🚀🚀🚀");
			"🚀 updatePricingDisplay called with pricing:", pricing;
			// Check which view is currently active
			const checkoutView = this.modal.querySelector(
				".mini-atc-modal__view.mini-atc-modal__checkout-view"
			);
			const personalizeView = this.modal.querySelector(
				".mini-atc-modal__view.mini-atc-modal__personalise-view"
			);

			"Pricing update - checkoutView display:", checkoutView?.style.display;
			"Pricing update - personalizeView display:",
				personalizeView?.style.display;
			"Pricing update - checkoutView computed display:",
				window.getComputedStyle(checkoutView)?.display;
			"Pricing update - personalizeView computed display:",
				window.getComputedStyle(personalizeView)?.display;

			// Check if checkout view is active (visible) - use computed style
			if (
				checkoutView &&
				window.getComputedStyle(checkoutView).display !== "none"
			) {
				("Using checkout pricing");
				this.updateCheckoutPricing();
				return;
			}

			// Check if personalize view is active (visible) - use computed style
			if (
				personalizeView &&
				window.getComputedStyle(personalizeView).display !== "none"
			) {
				try {
					await this.updatePersonalizePricing(pricing);
				} catch (error) {}
				return;
			}

			// Fallback to personalize pricing if no view is clearly active
			try {
				await this.updatePersonalizePricing(pricing);
			} catch (error) {}
		}

		updateCheckoutPricing() {
			// Get cart data and update pricing from cart totals
			fetch("/cart.js")
				.then((response) => response.json())
				.then((cartData) => {
					// Find pricing elements using the same selectors as personalize view
					const currentPriceEl =
						this.modal.querySelector("[data-current-price]") ||
						this.modal.querySelector(".mini-atc-modal__current-price");
					const originalPriceEl =
						this.modal.querySelector("[data-original-price]") ||
						this.modal.querySelector(".mini-atc-modal__original-price");
					const savingsEl =
						this.modal.querySelector("[data-savings-amount]") ||
						this.modal.querySelector(".mini-atc-modal__savings-text");

					// Calculate total compare at price for both original price and savings
					let totalCompareAtPrice = 0;
					let currentTotal = cartData.total_price;

					cartData.items.forEach((item) => {
						if (item.properties && item.properties["_Compare At Price"]) {
							const compareAtPrice =
								parseInt(item.properties["_Compare At Price"]) * item.quantity;
							totalCompareAtPrice += compareAtPrice;
						} else {
							totalCompareAtPrice += item.original_line_price;
						}
					});

					if (currentPriceEl) {
						// Update only the text content, preserve structure
						const placeholder = currentPriceEl.querySelector(
							".pricing-placeholder"
						);
						if (placeholder) {
							placeholder.textContent = this.formatMoney(cartData.total_price);
						} else {
							currentPriceEl.textContent = this.formatMoney(
								cartData.total_price
							);
						}
					}

					if (originalPriceEl) {
						// Update only the text content, preserve structure
						const placeholder =
							originalPriceEl.querySelector(".pricing-dynamic");
						if (placeholder) {
							placeholder.textContent = this.formatMoney(totalCompareAtPrice);
						} else {
							originalPriceEl.textContent =
								this.formatMoney(totalCompareAtPrice);
						}
					}

					if (savingsEl) {
						const savings = totalCompareAtPrice - currentTotal;

						if (savings > 0) {
							// Update only the text content, preserve structure
							const placeholder = savingsEl.querySelector(".pricing-dynamic");
							if (placeholder) {
								placeholder.textContent = `You Saved ${this.formatMoney(
									savings
								)}`;
							} else {
								savingsEl.textContent = `You Saved ${this.formatMoney(
									savings
								)}`;
							}
						}
					}
				})
				.catch((error) => {});
		}

		updateCheckoutItemPrices() {
			// Update all checkout item prices to use current currency
			const checkoutItems = this.modal.querySelectorAll(
				".checkout-products-wrap__current-price, .checkout-products-wrap__original-price, .checkout-products-wrap__addon-price, .premium-gift-box__price"
			);

			checkoutItems.forEach((item) => {
				const currentText = item.textContent;
				// Extract numeric value from price text
				const priceMatch = currentText.match(/[\d,]+\.?\d*/);
				if (priceMatch) {
					const numericValue = parseFloat(priceMatch[0].replace(/,/g, ""));
					const priceInCents = Math.round(numericValue * 100);
					item.textContent = this.formatMoney(priceInCents);
				}
			});
		}

		async updatePersonalizePricing(pricing) {
			("🎁🎁🎁 UPDATEPERSONALIZEPRICING METHOD CALLED 🎁🎁🎁");
			("🎁 updatePersonalizePricing START - METHOD CALLED");
			("🎁 updatePersonalizePricing START");
			("🎁 METHOD IS DEFINITELY BEING CALLED NOW");
			"🎁 Received pricing parameter:", pricing;
			"🎁 this.state exists:", !!this.state;
			"🎁 window.chuug_vessel_selections exists:",
				!!window.chuug_vessel_selections;
			"🎁 window.chuug_vessel_selections.selectedProductAmountData exists:",
				!!(
					window.chuug_vessel_selections &&
					window.chuug_vessel_selections.selectedProductAmountData
				);
			"🎁 Full window.chuug_vessel_selections:", window.chuug_vessel_selections;
			"🎁 window.pomcSystem exists:", !!window.pomcSystem;
			"🎁 window.pomcSystem.getMultiplier():",
				window.pomcSystem?.getMultiplier();

			// Get pricing from chuug_vessel_selections -> selectedProductAmountData
			if (
				window.chuug_vessel_selections &&
				window.chuug_vessel_selections.selectedProductAmountData
			) {
				("🎁 Found chuug_vessel_selections.selectedProductAmountData");
				const selectedData =
					window.chuug_vessel_selections.selectedProductAmountData;
				"🎁 selectedData:", selectedData;
				if (selectedData.variants) {
					("🎁 Found variants in selectedData");
					const engravingEnabled = this.getEngravingState();

					// Check for mixed vessel configuration
					const hasMixedConfig = this.hasMixedVesselConfiguration();
					let variantIndex;

					if (hasMixedConfig) {
						("🎁🪢 Mixed vessel configuration detected in personalize pricing");
						// For mixed configurations, use charcoal rope variant pricing
						// This ensures we get the higher pricing that includes charcoal upgrade costs
						variantIndex = engravingEnabled ? 3 : 2;
					} else {
						// Standard logic for uniform configuration
						const hasCharcoalRope = this.hasAnyCharcoalRopeSelected();
						variantIndex = this.getVariantIndex(
							hasCharcoalRope,
							engravingEnabled
						);
					}

					const variant = selectedData.variants[variantIndex];
					"🎁 Selected variant index:", variantIndex;
					"🎁 Selected variant:", variant;

					if (variant) {
						// Use pricing from selectedProductAmountData as base, but add gift box pricing
						let total = variant.price;
						let originalTotal = variant.compare_at_price;

						// Add gift box pricing if enabled
						const state = this.state ? this.state.getState() : null;
						let giftBoxPrice = this.dynamicPrices
							? this.dynamicPrices.giftBox
							: null;

						if (!state) {
							return;
						}

						if (!this.dynamicPrices) {
							// Use a fallback approach - get gift box price from global modal instance
							const modalInstance = window.MiniATCModal?.getInstance?.();
							if (modalInstance && modalInstance.pricing) {
								giftBoxPrice = modalInstance.pricing.dynamicPrices?.giftBox;
							}

							// If still no gift box price, use default
							if (!giftBoxPrice && state.giftBox?.enabled) {
								giftBoxPrice = 200; // Default £2.00 in cents
								"🎁 Using default gift box price:", giftBoxPrice;
							}
						} else {
							// If gift box price isn't loaded yet, try to initialize it
							if (!giftBoxPrice && state.giftBox?.enabled) {
								("🎁 Gift box price not loaded yet, initializing...");
								await this.initializeGiftBoxPricing();
								giftBoxPrice = this.dynamicPrices.giftBox;
								"🎁 Gift box price after initialization:", giftBoxPrice;
							}
						}

						const multiplier = window.pomcSystem?.getMultiplier() || 1;
						"🎁 Personalize pricing debug:",
							{
								giftBoxEnabled: state.giftBox?.enabled,
								giftBoxPrice: giftBoxPrice,
								multiplier: multiplier,
								variantPrice: variant.price,
								variantCompareAtPrice: variant.compare_at_price,
								beforeTotal: total,
								beforeOriginalTotal: originalTotal,
								giftBoxPriceIsValid: giftBoxPrice && giftBoxPrice > 0,
							};
						// Skip gift box pricing in main path since it's already applied by FORCE pricing
						("🎁 Main path: Gift box pricing already applied by FORCE pricing, skipping to avoid double counting");

						// Validate values before formatting
						"🎁 Validating pricing values:",
							{
								total,
								originalTotal,
								savings: originalTotal - total,
							};

						const validTotal = total && !isNaN(total) ? total : 0;
						const validOriginalTotal =
							originalTotal && !isNaN(originalTotal)
								? originalTotal
								: validTotal;
						const validSavings = validOriginalTotal - validTotal;

						pricing = {
							total: validTotal,
							originalTotal: validOriginalTotal,
							savings: validSavings,
							formattedTotal: Utils.formatPrice(validTotal),
							formattedOriginal: Utils.formatPrice(validOriginalTotal),
							formattedSavings: Utils.formatPrice(validSavings),
						};

						"🎁 Final pricing object:", pricing;
					}
				}
			} else {
				("🎁 No chuug_vessel_selections.selectedProductAmountData found, using fallback pricing");
				// Fallback: Add gift box pricing to the existing pricing parameter
				const state = this.state ? this.state.getState() : null;
				let giftBoxPrice = this.dynamicPrices
					? this.dynamicPrices.giftBox
					: null;

				if (!state) {
					return;
				}

				if (!this.dynamicPrices) {
					// Use a fallback approach - get gift box price from global modal instance
					const modalInstance = window.MiniATCModal?.getInstance?.();
					if (modalInstance && modalInstance.pricing) {
						giftBoxPrice = modalInstance.pricing.dynamicPrices?.giftBox;
					}

					// If still no gift box price, use default
					if (!giftBoxPrice && state.giftBox?.enabled) {
						giftBoxPrice = 200; // Default £2.00 in cents
						"🎁 FALLBACK: Using default gift box price:", giftBoxPrice;
					}
				} else {
					if (!giftBoxPrice && state.giftBox?.enabled) {
						("🎁 Fallback: Gift box price not loaded yet, initializing...");
						await this.initializeGiftBoxPricing();
						giftBoxPrice = this.dynamicPrices.giftBox;
						"🎁 Fallback: Gift box price after initialization:", giftBoxPrice;
					}
				}

				// Skip gift box pricing in fallback since it's already applied by FORCE pricing
				("🎁 Fallback: Gift box pricing already applied by FORCE pricing, skipping to avoid double counting");
			}

			// Try multiple selectors to find the price elements
			const currentPriceEl =
				this.modal.querySelector("[data-current-price]") ||
				this.modal.querySelector(".mini-atc-modal__current-price");
			const originalPriceEl =
				this.modal.querySelector("[data-original-price]") ||
				this.modal.querySelector(".mini-atc-modal__original-price");
			const savingsEl =
				this.modal.querySelector("[data-savings-amount]") ||
				this.modal.querySelector(".mini-atc-modal__savings-text");

			// Check if there are multiple modals
			const allModals = document.querySelectorAll(".mini-atc-modal");

			// Check all price elements on the page
			const allPriceElements = document.querySelectorAll(
				".mini-atc-modal__current-price, [data-current-price]"
			);

			if (currentPriceEl) {
				// Update the placeholder span inside the price element
				const placeholder = currentPriceEl.querySelector(
					".pricing-placeholder"
				);

				if (placeholder) {
					// Check if the text is actually different before updating
					if (placeholder.textContent !== pricing.formattedTotal) {
						placeholder.textContent = pricing.formattedTotal;
					} else {
					}
				} else {
					if (currentPriceEl.textContent !== pricing.formattedTotal) {
						currentPriceEl.textContent = pricing.formattedTotal;
					} else {
					}
				}
			} else {
			}

			if (originalPriceEl) {
				// Update the placeholder span inside the price element
				const placeholder = originalPriceEl.querySelector(
					".pricing-placeholder"
				);
				if (placeholder) {
					placeholder.textContent = pricing.formattedOriginal;
				} else {
					originalPriceEl.textContent = pricing.formattedOriginal;
				}
			}

			if (savingsEl) {
				// Update the savings text
				const placeholder = savingsEl.querySelector(".pricing-placeholder");
				if (placeholder) {
					placeholder.textContent = `You Saved ${pricing.formattedSavings}`;
				} else {
					savingsEl.textContent = `You Saved ${pricing.formattedSavings}`;
				}
			}
			("🎁 updatePersonalizePricing END");
		}

		switchView(viewName) {
			"Switching to view:", viewName;
			const views = this.modal.querySelectorAll(".mini-atc-modal__view");
			const targetView = this.modal.querySelector(`[data-view="${viewName}"]`);
			const titleEl = this.modal.querySelector(".mini-atc-modal__title");
			const addToCartBtn = this.modal.querySelector(
				".mini-atc-modal__add-to-cart-btn"
			);
			const btnTextEl = addToCartBtn?.querySelector(
				".mini-atc-modal__btn-text"
			);

			if (!targetView) return;

			// Update views
			views.forEach((view) => {
				view.classList.remove("mini-atc-modal__view--active");
				view.setAttribute("aria-hidden", "true");
			});

			targetView.classList.add("mini-atc-modal__view--active");
			targetView.setAttribute("aria-hidden", "false");

			// Update title
			if (titleEl) {
				switch (viewName) {
					case "checkout":
						titleEl.textContent =
							this.config.checkoutTitle || "Proceed to Checkout";
						break;
					case "personalize":
					default:
						titleEl.textContent =
							this.config.modalTitle || "Personalise Your CHUUG";
						break;
				}
			}

			// Update button label and action based on view
			if (btnTextEl && addToCartBtn) {
				switch (viewName) {
					case "checkout":
						// Check if cart is empty to show appropriate button
						// For now, we'll check if we're in an empty state by looking for the empty message
						const emptyMessage = this.modal.querySelector(
							".empty-cart-message"
						);
						if (emptyMessage && emptyMessage.style.display !== "none") {
							btnTextEl.textContent = "CONTINUE SHOPPING";
							addToCartBtn.setAttribute("data-modal-action", "close-modal");
							("✅ Button updated for empty checkout view: CONTINUE SHOPPING");
						} else {
							btnTextEl.textContent = "PROCEED TO CHECKOUT";
							addToCartBtn.setAttribute(
								"data-modal-action",
								"proceed-to-checkout"
							);
							("✅ Button updated for checkout view: PROCEED TO CHECKOUT");
						}
						break;
					case "personalize":
					default:
						btnTextEl.textContent = "ADD TO CART";
						addToCartBtn.setAttribute("data-modal-action", "add-to-cart");
						break;
				}
			} else {
			}

			// Scroll to top
			const content = this.modal.querySelector(".mini-atc-modal__content");
			if (content) {
				content.scrollTop = 0;
			}

			// Handle footer visibility based on view and context
			const footer = this.modal.querySelector(".mini-atc-modal__footer");
			if (footer) {
				if (
					viewName === "personalize" &&
					this.openingContext === "add-multiple-products"
				) {
					// Always show footer in personalize view for add-multiple-products
					footer.style.display = "";
					footer.style.opacity = "1";
				}
				// For checkout view, footer visibility is handled by showCheckoutSections/hideCheckoutSections
			}

			this.currentView = viewName;
			this.emit("viewChanged", viewName);
		}

		open(context = null) {
			if (this.isActive) return;

			// Store the opening context
			this.openingContext = context;

			// Switch to appropriate view based on context
			if (context === "add-multiple-products") {
				this.switchView("personalize");

				// Reset engraving state when opening from add-multiple-products
				("🔄 Resetting engraving state for add-multiple-products...");
				this.state.resetEngraving();

				// Reset engraving toggle to checked (default state)
				const engravingToggle = this.modal.querySelector(
					'[data-personalization-toggle="engraving"]'
				);
				if (engravingToggle) {
					engravingToggle.checked = true;

					// CRITICAL FIX: Sync content visibility immediately after resetting toggle
					this.syncEngravingContentVisibility();
				}

				// Ensure footer is visible for add-multiple-products context
				const footer = this.modal.querySelector(".mini-atc-modal__footer");
				if (footer) {
					footer.style.display = "";
					footer.style.opacity = "1";
				}

				// Console log state after clicking add-multiple-products
				"🛒 State after clicking add-multiple-products:",
					{
						context: this.openingContext,
						currentView: this.currentView,
						isActive: this.isActive,
						state: this.state.getState(),
						engravingVessels: this.state.getState().engraving?.vessels,
						modalId: this.modal.id,
						timestamp: new Date().toISOString(),
					};
			} else if (context === "cart-icon") {
				this.switchView("checkout");
				// Pre-hide sections for cart icon to prevent flash when cart is empty
				this.hideCheckoutSections();
			}

			// Ensure modal is properly hidden before showing
			this.modal.style.visibility = "hidden";
			this.modal.style.opacity = "0";

			this.modal.classList.add("mini-atc-modal--active");
			this.modal.setAttribute("aria-hidden", "false");
			document.body.style.overflow = "hidden";

			// Setup focus trap
			this.focusTrap = Utils.trapFocus(this.modal);

			this.isActive = true;
			this.emit("modalOpened");

			// Show modal with smooth transition after a brief delay
			requestAnimationFrame(() => {
				this.modal.style.visibility = "visible";
				this.modal.style.opacity = "1";
			});

			// If opening directly to checkout view (like from cart icon),
			// hide sections immediately to prevent flash
			if (this.currentView === "checkout") {
				this.hideCheckoutSections();
			}

			// Dispatch modal opened event for POMC integration
			this.modal.dispatchEvent(new CustomEvent("modalOpened"));

			// Update vessel personalization rows based on current vessel count
			this.updateVesselPersonalizationRows();

			// CRITICAL FIX: Ensure engraving content visibility is synced after rows are updated
			// This handles cases where the toggle state doesn't match the content visibility
			setTimeout(() => {
				this.syncEngravingContentVisibility();
			}, 10);

			// If opening from add-multiple-products, ensure all vessel inputs are cleared
			if (context === "add-multiple-products") {
				// Use setTimeout to ensure inputs are cleared after DOM updates
				setTimeout(() => {
					const vesselInputs = this.modal.querySelectorAll(
						"[data-vessel-input]"
					);
					vesselInputs.forEach((input) => {
						const vesselId = input.getAttribute("data-vessel-input");
						input.value = "";
						// CRITICAL: Also update state since programmatic changes don't trigger 'input' event
						this.state.updateVesselEngraving(vesselId, "");
					});
					"🔄 Cleared all vessel input fields AND state:", vesselInputs.length;
				}, 50);
			}

			// Fetch vessel selections data and update product images
			// this.fetchVesselSelectionsAndUpdateImages();

			// Calculate initial pricing
			this.calculatePricing().catch(() => {});

			// Setup engraving toggle listener now that modal is visible
			this.setupEngravingToggleListener();

			// Force pricing refresh to ensure it's up to date with any changes made while modal was closed
			setTimeout(() => {
				this.calculatePricing().catch(() => {});
			}, 200);

			// Initialize components that need the modal to be visible
			setTimeout(() => {
				if (
					!this.swiper &&
					this.modal.querySelector(".mini-atc-product-swiper")
				) {
					this.swiper = new ProductImageSwiper(
						this.modal.querySelector(".mini-atc-product-swiper")
					);
				}
			}, 100);
		}

		close() {
			// Check if modal is visually active (either through isActive state or CSS class)
			const isVisuallyActive =
				this.isActive ||
				this.modal.classList.contains("mini-atc-modal--active");

			if (!isVisuallyActive) {
				return;
			}

			// Start fade out animation
			this.modal.style.opacity = "0";

			// Wait for fade out animation to complete before hiding
			setTimeout(() => {
				this.modal.classList.remove("mini-atc-modal--active");
				this.modal.setAttribute("aria-hidden", "true");
				this.modal.style.visibility = "hidden";
				document.body.style.overflow = "";

				// Remove focus trap
				if (this.focusTrap) {
					this.focusTrap();
					this.focusTrap = null;
				}

				// Reset to preview (personalize) view when closing
				this.switchView("personalize");

				this.isActive = false;
				this.emit("modalClosed");
			}, 200); // Match this with CSS transition duration
		}

		async addToCart() {
			// Prevent duplicate calls
			if (this.isAddingToCart) {
				return;
			}

			this.isAddingToCart = true;

			try {
				// Show loading state
				this.setLoadingState(true);

				// CRITICAL: Sync input field values with state before collecting cart data
				("🔄 Syncing input field values with state before adding to cart...");
				const vesselInputs = this.modal.querySelectorAll("[data-vessel-input]");
				vesselInputs.forEach((input) => {
					const vesselId = input.getAttribute("data-vessel-input");
					const currentValue = input.value || "";
					const stateValue =
						this.state.getState().engraving?.vessels?.[vesselId] || "";

					`🔄 Vessel ${vesselId}: Input="${currentValue}", State="${stateValue}"`;

					// If values don't match, update state to match input
					if (currentValue !== stateValue) {
						`⚠️ MISMATCH! Updating state to match input for Vessel ${vesselId}`;
						this.state.updateVesselEngraving(vesselId, currentValue);
					}
				});

				// Collect all data for cart
				const cartData = await this.collectCartData();

				if (!cartData || cartData.items.length === 0) {
					throw new Error("No items to add to cart");
				}

				// Add items to Shopify cart
				const response = await this.addItemsToShopifyCart(cartData);

				if (response.status) {
					// Handle Shopify error response
					throw new Error(
						response.description || "Failed to add items to cart"
					);
				}

				// Success - emit event and switch to checkout view
				this.emit("cartUpdated", { cartData: response, items: cartData.items });

				// Update cart icon bubble and cart UI
				this.updateCartIconBubble(response);

				// Switch to checkout view instead of closing
				this.switchView("checkout");

				// Show cart loading spinner while fetching fresh cart data
				this.showCartLoadingSpinner();

				// Fetch fresh cart data and update checkout view
				const freshCartData = await this.fetchUpdatedCartData();

				if (freshCartData) {
					await this.updateCheckoutViewWithCartData(freshCartData);
				}

				// Hide cart loading spinner
				this.hideCartLoadingSpinner();

				// Ensure checkout container is visible
				const checkoutContainer = this.modal.querySelector(
					"[data-checkout-items]"
				);
				if (checkoutContainer) {
					checkoutContainer.style.display = "";
				}

				// Show success feedback
				// this.showAddToCartSuccess(cartData.items.length);

				// Reset personalization toggles and gift box toggle after successful add to cart
				this.resetPersonalizationToggles();
				this.resetGiftBoxToggle();

				// Reset gift box state (not just the toggle UI)
				this.state.updatePersonalization("giftBox", { enabled: false });

				// Reset extra cups state as well
				this.state.updatePersonalization("extraCups", { enabled: false });

				"🔄 Reset add-on states after cart addition:", this.state.getState();

				// Update pricing after reset
				this.calculatePricing().catch(() => {});

				// Update checkout pricing to reflect cart totals
				this.updateCheckoutPricing();

				// Optional: redirect to cart page after delay
				// setTimeout(() => {
				//   window.location.href = window.routes.cart_url || '/cart';
				// }, 2000);
			} catch (error) {
				this.handleAddToCartError(error.message);
				// Hide cart loading spinner on error
				this.hideCartLoadingSpinner();
			} finally {
				this.setLoadingState(false);
				// Reset the flag
				this.isAddingToCart = false;
			}
		}

		async collectCartData() {
			const state = this.state.getState();

			const items = [];

			// Collect vessel products and their associated add-ons in interleaved order
			const vesselItems = await this.collectVesselProducts(state);
			const addonItems = this.collectAddonProducts(state);

			// Group add-ons by vessel number for easier lookup
			const addonsByVessel = {};
			addonItems.forEach((addon) => {
				const vesselNumber = addon.properties["_Vessel Number"];
				if (vesselNumber) {
					if (!addonsByVessel[vesselNumber]) {
						addonsByVessel[vesselNumber] = [];
					}
					addonsByVessel[vesselNumber].push(addon);
				}
			});

			// Interleave vessels with their add-ons
			vesselItems.forEach((vessel) => {
				// Add the vessel first
				items.push(vessel);

				// Find vessel number from properties
				let vesselNumber = null;
				for (const [key, value] of Object.entries(vessel.properties)) {
					if (key.includes("Vessel") && key.includes("Product")) {
						// Extract the number from property name like "_Vessel 2 Product"
						const parts = key.split(" ");
						// Handle both "_Vessel" (split creates ["_Vessel"]) and old "Vessel" format
						const numberIndex = parts[0].startsWith("_") ? 1 : 1;
						if (parts.length >= 2) {
							vesselNumber = parts[numberIndex];
							break;
						}
					}
				}

				// Add associated add-ons immediately after the vessel
				if (vesselNumber && addonsByVessel[vesselNumber]) {
					items.push(...addonsByVessel[vesselNumber]);
				}
			});

			// Add any remaining add-ons that don't have a specific vessel number
			addonItems.forEach((addon) => {
				if (!addon.properties["_Vessel Number"]) {
					items.push(addon);
				}
			});

			// Reverse the order of items before adding to cart
			items.reverse();

			const cartData = {
				items,
				note: this.collectOrderNote(state),
				attributes: this.collectOrderAttributes(state),
			};

			"🛒 CART DATA TO BE SENT:", JSON.stringify(cartData, null, 2);

			return cartData;
		}

		/**
		 * Create properties for a single vessel item
		 */
		async createVesselProperties(
			selection,
			vesselNumber,
			state,
			engravingEnabled,
			selectedProductAmountData,
			variantIndex
		) {
			const properties = {};

			// VISIBLE PROPERTIES (for checkout display)

			// Add Monogram Initials for this specific vessel
			const vesselEngravingData =
				state.engraving?.vessels?.[vesselNumber] || "";
			const vesselEngraving = this.getVesselEngravingText(vesselEngravingData);
			if (
				engravingEnabled &&
				vesselEngraving &&
				vesselEngraving.trim() !== ""
			) {
				properties["Monogram Initials"] = vesselEngraving.trim().toUpperCase();
			} else {
				properties["Monogram Initials"] = "N/A";
			}

			// For individual vessel products (mixed config), don't add bundle-specific properties
			// Only add essential properties to avoid conflicts with Shopify's product structure

			// Check if gift box is enabled (only if this is a bundle product)
			if (selectedProductAmountData?.variants && variantIndex !== null) {
				// This is a bundle product, add bundle properties
				const variantData = selectedProductAmountData.variants[variantIndex];
				if (variantData?.title) {
					properties["Choose Your Coins"] = variantData.title;
				}

				// Check if gift box is enabled for this specific vessel by checking cart
				// Note: This will be updated when the cart is refreshed, so we'll check the current cart state
				const hasGiftBox = await this.checkGiftBoxInCart(vesselNumber.toString());
				properties["Gift Box"] = hasGiftBox ? "yes" : "no";

				if (hasGiftBox) {
					const giftBoxTitle = this.getGiftBoxProductTitle();
					properties["Gift Option"] = giftBoxTitle;
				}
			}

			// HIDDEN PROPERTIES (with underscore - for backend use only)

			// Add vessel engraving (hidden) - for this specific vessel
			if (
				engravingEnabled &&
				vesselEngraving &&
				vesselEngraving.trim() !== ""
			) {
				properties[`_Vessel ${vesselNumber} Engraving`] = vesselEngraving
					.trim()
					.toUpperCase();
			}

			// Add vessel selection details (hidden) - for this specific vessel
			if (selection) {
				if (selection.productHandle) {
					properties[`_Vessel ${vesselNumber} Product`] =
						selection.productHandle;
				}
				if (selection.woodType) {
					properties[`_Vessel ${vesselNumber} Wood Type`] = selection.woodType;
				}
				if (selection.ropeType) {
					properties[`_Vessel ${vesselNumber} Rope Type`] = selection.ropeType;
				}
			}

			// Add compare-at price (hidden) - per item price for this vessel
			if (selectedProductAmountData?.variants && variantIndex !== null) {
				const variantData = selectedProductAmountData.variants[variantIndex];
				if (variantData?.compare_at_price) {
					properties["_Compare At Price"] = variantData.compare_at_price;
				}
			}
			// For individual vessel products, we don't have compare-at price from bundle data

			// Add unique line identifier to prevent Shopify from consolidating items
			const uniqueLineId = `${Date.now()}-V${vesselNumber}-${Math.random()
				.toString(36)
				.substring(2, 11)}`;
			properties["_Unique Line ID"] = uniqueLineId;

			return properties;
		}

		/**
		 * Get individual vessel variant ID based on wood type and rope type
		 * For individual products, we need variant IDs, not product IDs
		 */
		async getIndividualVesselVariantId(woodType, ropeType, hasEngraving) {
			const key = `${woodType?.toLowerCase()}_${ropeType?.toLowerCase()}`;

			// Check if we have product handles
			if (!window.PRODUCT_HANDLES || !window.PRODUCT_HANDLES[key]) {
				return null;
			}

			const productHandle = window.PRODUCT_HANDLES[key];

			// Fetch product data to get variant IDs
			try {
				const response = await fetch(`/products/${productHandle}.js`);
				const productData = await response.json();

				if (
					!productData ||
					!productData.variants ||
					productData.variants.length === 0
				) {
					return null;
				}

				// Determine variant index based on rope type and engraving
				// Individual vessel products have the same variant structure as bundles:
				// 0: Natural, No Engraving
				// 1: Natural, With Engraving
				// 2: Charcoal, No Engraving
				// 3: Charcoal, With Engraving
				const isCharcoal = ropeType && ropeType.toLowerCase() === "charcoal";
				let variantIndex;

				if (isCharcoal) {
					// Charcoal products: index 2 (no engraving) or 3 (with engraving)
					variantIndex = hasEngraving ? 3 : 2;
				} else {
					// Natural products: index 0 (no engraving) or 1 (with engraving)
					variantIndex = hasEngraving ? 1 : 0;
				}

				const variant =
					productData.variants[variantIndex] || productData.variants[0];

				return variant.id;
			} catch (error) {
				return null;
			}
		}

		/**
		 * Get individual vessel product ID based on wood type and rope type (synchronous fallback)
		 */
		getIndividualVesselProductId(woodType, ropeType) {
			// Use POMC system's product ID mapping
			if (!window.PRODUCT_IDS) {
				return null;
			}

			const key = `${woodType?.toLowerCase()}_${ropeType?.toLowerCase()}`;
			const productId = window.PRODUCT_IDS[key];

			if (!productId) {
			}

			return productId || null;
		}

		async collectVesselProducts(state) {
			const items = [];

			// Get vessel selections from POMC system
			if (!window.pomcSystem) {
				return items;
			}

			const vesselSelections = window.pomcSystem.getAllVesselSelections();
			const multiplier = window.pomcSystem.getMultiplier() || 1;
			const selectedProductAmountData =
				window.pomcSystem.getSelectedProductAmountData();

			// Determine if engraving is enabled
			const engravingEnabled = this.isEngravingEnabled();

			// Check for mixed vessel configuration
			const hasMixedConfig = this.hasMixedVesselConfiguration();

			if (hasMixedConfig) {
				("🛒 Mixed config: Creating separate items");

				// For mixed configurations, create separate items for each vessel using individual vessel variant IDs
				for (let i = 1; i <= multiplier; i++) {
					const selection = vesselSelections[i];
					if (!selection) continue;

					// Check if this specific vessel has engraving
					const vesselEngravingData = state.engraving?.vessels?.[i] || "";
					const vesselEngraving =
						this.getVesselEngravingText(vesselEngravingData);
					const vesselHasEngraving =
						engravingEnabled &&
						vesselEngraving &&
						vesselEngraving.trim() !== "";

					// Get individual vessel variant ID (async)
					const individualVariantId = await this.getIndividualVesselVariantId(
						selection.woodType,
						selection.ropeType,
						vesselHasEngraving
					);

					if (!individualVariantId) {
						continue;
					}

					// Create properties for this specific vessel
					const vesselProperties = await this.createVesselProperties(
						selection,
						i,
						state,
						engravingEnabled,
						null,
						null
					);

					// Create individual vessel item using individual variant ID
					const vesselItem = {
						id: individualVariantId,
						quantity: 1,
						properties: vesselProperties,
					};

					items.push(vesselItem);
				}

				return items; // Return early for mixed configurations
			}

			// Standard logic for uniform configuration (all vessels have same rope type)
			const hasCharcoalRope = this.hasAnyCharcoalRopeSelected();
			const variantIndex = this.getVariantIndex(
				hasCharcoalRope,
				engravingEnabled
			);

			let variantId = null;
			if (selectedProductAmountData?.variants?.[variantIndex]) {
				variantId = selectedProductAmountData.variants[variantIndex].id;
			} else {
				return items;
			}

			if (!variantId) {
				return items;
			}

			// Create properties object for the bundle
			const properties = {};

			// VISIBLE PROPERTIES (for checkout display)

			// Add Monogram Initials (visible on checkout) - collect all vessel engravings
			const allEngravings = [];
			for (let i = 1; i <= multiplier; i++) {
				const vesselEngravingData = state.engraving?.vessels?.[i] || "";
				const vesselEngraving =
					this.getVesselEngravingText(vesselEngravingData);
				if (
					engravingEnabled &&
					vesselEngraving &&
					vesselEngraving.trim() !== ""
				) {
					allEngravings.push(vesselEngraving.trim().toUpperCase());
				}
			}

			if (allEngravings.length > 0) {
				properties["Monogram Initials"] = allEngravings.join(", ");
			} else {
				properties["Monogram Initials"] = "N/A";
			}

			// Add Choose Your Coins info (visible on checkout)
			if (selectedProductAmountData?.variants) {
				const variantData = selectedProductAmountData.variants[variantIndex];
				if (variantData?.title) {
					properties["Choose Your Coins"] = variantData.title;
				}
			}

			// Check if gift box is enabled for any vessel in this bundle by checking cart
			const hasGiftBox = await this.checkAnyGiftBoxInCart();
			properties["Gift Box"] = hasGiftBox ? "yes" : "no";

			if (hasGiftBox) {
				// Get the actual gift box product title dynamically
				const giftBoxTitle = this.getGiftBoxProductTitle();
				properties["Gift Option"] = giftBoxTitle;
			}

			// HIDDEN PROPERTIES (with underscore - for backend use only)

			// Add vessel engravings (hidden) - one per vessel
			for (let i = 1; i <= multiplier; i++) {
				const vesselEngravingData = state.engraving?.vessels?.[i] || "";
				const vesselEngraving =
					this.getVesselEngravingText(vesselEngravingData);
				if (
					engravingEnabled &&
					vesselEngraving &&
					vesselEngraving.trim() !== ""
				) {
					properties[`_Vessel ${i} Engraving`] = vesselEngraving
						.trim()
						.toUpperCase();
				}
			}

			// Add vessel selection details (hidden) - collect all vessel selections
			for (let i = 1; i <= multiplier; i++) {
				const selection = vesselSelections[i];
				if (selection) {
					if (selection.productHandle) {
						properties[`_Vessel ${i} Product`] = selection.productHandle;
					}
					if (selection.woodType) {
						properties[`_Vessel ${i} Wood Type`] = selection.woodType;
					}
					if (selection.ropeType) {
						properties[`_Vessel ${i} Rope Type`] = selection.ropeType;
					}
				}
			}

			// Add compare-at price (hidden)
			if (selectedProductAmountData?.variants) {
				const variantData = selectedProductAmountData.variants[variantIndex];
				if (variantData?.compare_at_price && multiplier > 0) {
					// Divide bundle compare-at price by multiplier to get per-item price
					const perItemCompareAtPrice = Math.round(
						variantData.compare_at_price / multiplier
					);
					properties["_Compare At Price"] = perItemCompareAtPrice;
				}
			}

			// Add unique line identifier to prevent Shopify from consolidating items
			// Use a consistent ID based on the bundle configuration to prevent duplicates
			const ropeConfig = hasMixedConfig
				? "mixed"
				: this.hasAnyCharcoalRopeSelected()
				? "charcoal"
				: "natural";
			const bundleConfig = `${multiplier}-${ropeConfig}-${
				engravingEnabled ? "engraved" : "plain"
			}`;
			const uniqueLineId = `BUNDLE-${bundleConfig}-${Date.now()}`;
			properties["_Unique Line ID"] = uniqueLineId;

			// Create ONE bundle item with quantity = multiplier
			const bundleItem = {
				id: variantId,
				quantity: multiplier, // This is the key fix - quantity should be the number of vessels
				properties,
			};

			items.push(bundleItem);

			// Check if no vessel items were collected
			if (items.length === 0) {
			}

			return items;
		}

		collectAddonProducts(state) {
			const items = [];

			// 0. Charcoal Rope Upgrade - Add one per vessel with charcoal rope
			if (window.pomcSystem) {
				const vesselSelections = window.pomcSystem.getAllVesselSelections();
				const charcoalUpgradeVariantId = this.getCharcoalUpgradeVariantId();

				// Only add charcoal upgrades if the variant ID is available
				// If not available, skip charcoal upgrades (they might be included in the vessel price)
				if (charcoalUpgradeVariantId) {
					let charcoalVesselNumber = 0;
					Object.entries(vesselSelections).forEach(
						([vesselIndex, selection]) => {
							if (
								selection.ropeType &&
								selection.ropeType.toLowerCase() === "charcoal"
							) {
								charcoalVesselNumber++;
								const uniqueLineId = `${Date.now()}-CHARCOAL${charcoalVesselNumber}-${Math.random()
									.toString(36)
									.substr(2, 9)}`;

								const charcoalUpgradeItem = {
									id: charcoalUpgradeVariantId,
									quantity: 1,
									properties: {
										// VISIBLE PROPERTIES (for checkout display)
										"Monogram Initials": "N/A",

										// HIDDEN PROPERTIES (for backend use only)
										"_Add-on": "Charcoal Rope Upgrade",
										"_Product Handle": "charcoal-rope-upgrade",
										"_Vessel Number": vesselIndex,
										"_Unique Line ID": uniqueLineId,
									},
								};
								items.push(charcoalUpgradeItem);
							}
						}
					);
				}
			}

			// Gift boxes are now added directly to cart via toggle, not through collectCartData

			// 2. Mix & Match variants
			if (state.mixMatch?.enabled && state.mixMatch.variants) {
				Object.entries(state.mixMatch.variants).forEach(
					([variantId, quantity]) => {
						if (quantity > 0) {
							const mixMatchItem = {
								id: variantId,
								quantity: quantity,
								properties: {
									"_Add-on": "Mix & Match",
								},
							};
							items.push(mixMatchItem);
						}
					}
				);
			}

			// 3. Extra Cups variants
			if (state.extraCups?.enabled && state.extraCups.variants) {
				Object.entries(state.extraCups.variants).forEach(
					([variantId, quantity]) => {
						if (quantity > 0) {
							const extraCupsItem = {
								id: variantId,
								quantity: quantity,
								properties: {
									"_Add-on": "Extra Cups",
								},
							};
							items.push(extraCupsItem);
						}
					}
				);
			}

			return items;
		}

		collectOrderNote(state) {
			const notes = [];

			// Add personalization summary
			if (state.engraving?.enabled) {
				const vesselCount = Object.keys(state.engraving.vessels || {}).length;
				if (vesselCount > 0) {
					notes.push(`Personalized ${vesselCount} vessel(s) with engraving`);
				}
			}

			// Add charcoal rope selection summary
			if (window.pomcSystem) {
				const vesselSelections = window.pomcSystem.getAllVesselSelections();
				let charcoalCount = 0;
				Object.values(vesselSelections).forEach((selection) => {
					if (
						selection.ropeType &&
						selection.ropeType.toLowerCase() === "charcoal"
					) {
						charcoalCount++;
					}
				});
				if (charcoalCount > 0) {
					notes.push(`${charcoalCount} Charcoal Rope Upgrade(s)`);
				}
			}

			// Add add-on summary
			const addons = [];
			if (state.giftBox?.enabled) addons.push("Premium Gift Box");
			if (state.mixMatch?.enabled) addons.push("Mix & Match");
			if (state.extraCups?.enabled) addons.push("Extra Cups");

			if (addons.length > 0) {
				notes.push(`Add-ons: ${addons.join(", ")}`);
			}

			return notes.join(" | ");
		}

		collectOrderAttributes(state) {
			const attributes = {};

			// Add modal source
			attributes["Order Source"] = "Mini ATC Modal";

			// Add personalization details
			if (state.engraving?.enabled) {
				attributes["Engraving Enabled"] = "Yes";

				// Add individual vessel engravings
				Object.entries(state.engraving.vessels || {}).forEach(
					([vesselId, vesselData]) => {
						const text = this.getVesselEngravingText(vesselData);
						if (text && text.trim() !== "") {
							attributes[`Vessel ${vesselId} Text`] = text.trim().toUpperCase();
						}
					}
				);
			}

			// Add POMC system data
			if (window.pomcSystem) {
				const multiplier = window.pomcSystem.getMultiplier();
				if (multiplier) {
					attributes["Vessel Count"] = multiplier.toString();
				}
			}

			return attributes;
		}

		getGiftBoxVariantId() {
			("🔍 Getting gift box variant ID...");

			// Try to get from modal config first
			const config = this.config;
			"🔍 Modal config:", config;
			if (config.giftBox?.variantId) {
				"✅ Found variant ID in config:", config.giftBox.variantId;
				return config.giftBox.variantId;
			}

			// Try to get from DOM
			const giftBoxToggle = this.modal.querySelector(
				"[data-gift-box-variant-id]"
			);
			"🔍 Gift box toggle element:", giftBoxToggle;
			if (giftBoxToggle) {
				const variantId = giftBoxToggle.getAttribute(
					"data-gift-box-variant-id"
				);
				"✅ Found variant ID in DOM:", variantId;
				return variantId;
			}

			// Fallback - you may need to set this based on your actual gift box product
			("❌ No gift box variant ID found in config or DOM");
			return null;
		}

		async checkGiftBoxInCart(vesselNumber) {
			try {
				const cartResponse = await fetch('/cart.js');
				const cart = await cartResponse.json();
				
				const giftBoxItem = cart.items.find(cartItem => 
					cartItem.properties && 
					cartItem.properties['_Add-on'] === 'Premium Gift Box' &&
					cartItem.properties['_Vessel Number'] === vesselNumber
				);
				
				return !!giftBoxItem;
			} catch (error) {
				console.error('🎁 Error checking gift box in cart:', error);
				return false;
			}
		}

		async checkAnyGiftBoxInCart() {
			try {
				const cartResponse = await fetch('/cart.js');
				const cart = await cartResponse.json();
				
				const giftBoxItem = cart.items.find(cartItem => 
					cartItem.properties && 
					cartItem.properties['_Add-on'] === 'Premium Gift Box'
				);
				
				return !!giftBoxItem;
			} catch (error) {
				console.error('🎁 Error checking any gift box in cart:', error);
				return false;
			}
		}

		getGiftBoxProductTitle() {
			("🔍 Getting gift box product title...");

			// Try to get from modal config first
			const config = this.config;
			if (config.giftBox?.productTitle) {
				"✅ Found product title in config:", config.giftBox.productTitle;
				return config.giftBox.productTitle;
			}

			// Try to get from DOM
			const giftBoxToggle = this.modal.querySelector(
				"[data-gift-box-product-title]"
			);
			if (giftBoxToggle) {
				const productTitle = giftBoxToggle.getAttribute(
					"data-gift-box-product-title"
				);
				"✅ Found product title in DOM:", productTitle;
				return productTitle;
			}

			// Fallback
			("⚠️ No gift box product title found, using fallback");
			return "Premium Gift Box and Tissue Wrap";
		}

		getCharcoalUpgradeVariantId() {
			("🔍 Getting charcoal upgrade variant ID...");

			// Try to get from modal config first
			const config = this.config;
			if (config.charcoalUpgrade?.variantId) {
				"✅ Found charcoal upgrade variant ID in config:",
					config.charcoalUpgrade.variantId;
				return config.charcoalUpgrade.variantId;
			}

			// Try to get from DOM
			const charcoalUpgradeElement = this.modal.querySelector(
				"[data-charcoal-upgrade-variant-id]"
			);
			if (charcoalUpgradeElement) {
				const variantId = charcoalUpgradeElement.getAttribute(
					"data-charcoal-upgrade-variant-id"
				);
				"✅ Found charcoal upgrade variant ID in DOM:", variantId;
				return variantId;
			}

			// Try to get from global config
			if (window.CHARCOAL_UPGRADE_VARIANT_ID) {
				"✅ Found charcoal upgrade variant ID in global config:",
					window.CHARCOAL_UPGRADE_VARIANT_ID;
				return window.CHARCOAL_UPGRADE_VARIANT_ID;
			}

			// Fallback - needs to be set in Shopify theme settings
			("❌ No charcoal upgrade variant ID found in config or DOM");
			return null;
		}

		async addItemsToShopifyCart(cartData) {
			// Add items to cart without clearing existing items
			// Each item has a unique _Unique Line ID property to prevent Shopify from consolidating

			const config = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					items: cartData.items,
					...(cartData.note && { note: cartData.note }),
					...(Object.keys(cartData.attributes).length > 0 && {
						attributes: cartData.attributes,
					}),
					// Request updated sections for cart icon bubble
					sections: "cart-icon-bubble",
					sections_url: window.location.pathname,
				}),
			};

			"🛒 SENDING TO SHOPIFY:", config.body;
			const response = await fetch("/cart/add.js", config);
			const result = await response.json();

			// Check for errors
			if (result.status || result.errors || result.message) {
				console.error("❌ SHOPIFY CART ERROR:", {
					status: result.status,
					errors: result.errors,
					message: result.message,
					description: result.description,
					full_response: result,
				});

				// Try to get more details by testing each item individually
				("🔍 Testing individual items to find the problematic one...");
				const cartData = JSON.parse(config.body);
				for (let i = 0; i < cartData.items.length; i++) {
					const item = cartData.items[i];
					`🔍 Testing item ${i + 1}/${cartData.items.length}:`,
						{
							id: item.id,
							quantity: item.quantity,
							properties: item.properties,
						};
				}
			} else {
				"✅ SHOPIFY RESPONSE:", result;
			}

			return result;
		}

		async restructureCartOrder() {
			try {
				// Get current cart data
				const cartResponse = await fetch('/cart.js');
				const cart = await cartResponse.json();
				
				// Separate products and gift boxes
				const products = [];
				const giftBoxes = [];
				
				cart.items.forEach(item => {
					if (item.properties && item.properties['_Add-on'] === 'Premium Gift Box') {
						giftBoxes.push(item);
					} else {
						products.push(item);
					}
				});
				
				// Create ordered structure: Product → Gift → Product → Gift
				const orderedItems = [];
				
				products.forEach(product => {
					// Add the product first
					orderedItems.push(product);
					
					// Find associated gift box
					const associatedGiftBox = giftBoxes.find(giftBox => 
						giftBox.properties['_Vessel Number'] === product.id.toString()
					);
					
					// Add gift box if it exists
					if (associatedGiftBox) {
						orderedItems.push(associatedGiftBox);
					}
				});
				
				// Note: Cart order restructuring is handled by Shopify's natural cart order
				// The gift box will appear after the product due to the order of addition
				
			} catch (error) {
				console.error('❌ Error restructuring cart order:', error);
			}
		}

		async updateProductGiftBoxProperties(vesselId, hasGiftBox) {
			try {
				// Wait a moment for cart to be updated
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// Get current cart data
				const cartResponse = await fetch('/cart.js');
				const cart = await cartResponse.json();
				
				
				// Find the product item
				const productItem = cart.items.find(item => 
					item.id.toString() === vesselId && 
					!item.properties?.['_Add-on']
				);
				
				
				if (productItem) {
					// Get current properties
					const currentProperties = { ...productItem.properties };
					
					
					// Update gift box properties
					if (hasGiftBox) {
						currentProperties["Gift Box"] = "yes";
						currentProperties["Gift Option"] = "Premium Gift Box and Tissue Wrap";
					} else {
						delete currentProperties["Gift Box"];
						delete currentProperties["Gift Option"];
					}
					
					
					// Update the product item properties
					const updateResponse = await fetch('/cart/change.js', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							id: productItem.key,
							properties: currentProperties
						})
					});
					
					if (updateResponse.ok) {
					} else {
					}
				} else {
				}
			} catch (error) {
			}
		}

		async updateCartIconBubbleWithSections() {
			try {
				// Fetch cart icon bubble section
				const sectionUrl = `${window.location.pathname}?sections=cart-icon-bubble`;
				const sectionResponse = await fetch(sectionUrl);
				
				if (sectionResponse.ok) {
					const sectionData = await sectionResponse.json();
					
					// Create response object with sections for updateCartIconBubble
					const responseWithSections = {
						sections: sectionData
					};
					
					this.updateCartIconBubble(responseWithSections);
				} else {
					console.warn('⚠️ Failed to fetch cart icon bubble section');
				}
			} catch (error) {
				console.error('❌ Error updating cart icon bubble:', error);
			}
		}

		updateCartIconBubble(response) {
			// Update cart icon bubble with the returned section HTML
			if (response.sections && response.sections["cart-icon-bubble"]) {
				const cartIconBubble = document.getElementById("cart-icon-bubble");
				if (cartIconBubble) {
					const parser = new DOMParser();
					const doc = parser.parseFromString(
						response.sections["cart-icon-bubble"],
						"text/html"
					);
					const newContent = doc.querySelector(".shopify-section");
					if (newContent) {
						cartIconBubble.innerHTML = newContent.innerHTML;
					}
				}
			}

			// Update cart drawer or cart notification if they exist
			const cartDrawer = document.querySelector("cart-drawer");
			const cartNotification = document.querySelector("cart-notification");
			if (cartDrawer && typeof cartDrawer.renderContents === "function") {
				cartDrawer.renderContents(response);
			} else if (
				cartNotification &&
				typeof cartNotification.renderContents === "function"
			) {
				cartNotification.renderContents(response);
			}
		}

		setLoadingState(loading) {
			const addToCartBtn = this.modal.querySelector(
				".mini-atc-modal__add-to-cart-btn"
			);
			const btnText = addToCartBtn?.querySelector(".mini-atc-modal__btn-text");

			if (loading) {
				addToCartBtn?.classList.add("loading");
				addToCartBtn?.setAttribute("disabled", "true");
				if (btnText) {
					btnText.textContent = "ADDING TO CART...";
					("🔄 Button loading state: ADDING TO CART...");
				}
			} else {
				addToCartBtn?.classList.remove("loading");
				addToCartBtn?.removeAttribute("disabled");
				// Set button text based on current view
				if (btnText) {
					if (this.currentView === "checkout") {
						btnText.textContent = "PROCEED TO CHECKOUT";
						("✅ Button loading complete (checkout view): PROCEED TO CHECKOUT");
					} else {
						btnText.textContent = "ADD TO CART";
						("✅ Button loading complete (personalize view): ADD TO CART");
					}
				}
			}
		}

		showAddToCartSuccess(itemCount) {
			// Create or update success message
			let successMessage = this.modal.querySelector(".add-to-cart-success");

			if (!successMessage) {
				successMessage = document.createElement("div");
				successMessage.className = "add-to-cart-success";
				successMessage.setAttribute("role", "status");
				successMessage.setAttribute("aria-live", "polite");

				// Insert at the top of the checkout view
				const checkoutView = this.modal.querySelector('[data-view="checkout"]');
				if (checkoutView) {
					checkoutView.insertBefore(successMessage, checkoutView.firstChild);
				}
			}

			// Update message content
			const itemText = itemCount === 1 ? "item" : "items";
			successMessage.innerHTML = `
				<div class="success-content">
					<svg class="success-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
						<circle cx="10" cy="10" r="10" fill="#4CAF50"/>
						<path d="M6 10L8.5 12.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					<span class="success-text">Successfully added ${itemCount} ${itemText} to cart!</span>
				</div>
			`;

			// Add CSS if not already present
			if (!document.querySelector("#add-to-cart-success-styles")) {
				const style = document.createElement("style");
				style.id = "add-to-cart-success-styles";
				style.textContent = `
					.add-to-cart-success {
						background: #e8f5e8;
						border: 1px solid #4CAF50;
						border-radius: 8px;
						padding: 12px 16px;
						margin-bottom: 16px;
						animation: slideInSuccess 0.3s ease-out;
						position:absolute;
						top:0;
						left:0;
						right:0;
						z-index:99;
					}
					
					.success-content {
						display: flex;
						align-items: center;
						gap: 8px;
					}
					
					.success-icon {
						flex-shrink: 0;
					}
					
					.success-text {
						color: #2e7d32;
						font-family: Gabarito, sans-serif;
						font-size: 14px;
						font-weight: 600;
					}
					
					@keyframes slideInSuccess {
						from {
							opacity: 0;
							transform: translateY(-10px);
						}
						to {
							opacity: 1;
							transform: translateY(0);
						}
					}
				`;
				document.head.appendChild(style);
			}

			// Auto-hide after 5 seconds
			setTimeout(() => {
				if (successMessage && successMessage.parentNode) {
					successMessage.style.opacity = "0";
					setTimeout(() => {
						if (successMessage && successMessage.parentNode) {
							successMessage.remove();
						}
					}, 300);
				}
			}, 3000);
		}

		handleAddToCartError(errorMessage) {
			// Show error message to user
			console.error("Add to cart failed:", errorMessage);

			// You can implement a toast notification or modal error display here
			// For now, we'll use a simple alert
			alert(`Failed to add items to cart: ${errorMessage}`);

			// Emit error event for external handling
			this.emit("cartError", { message: errorMessage });
		}

		async updateCheckoutView(cartResponse) {
			try {
				// Fetch updated cart data from Shopify
				const cartData = await this.fetchUpdatedCartData();

				if (!cartData || !cartData.items) {
					console.warn("No cart data available for checkout view update");
					return;
				}

				await this.updateCheckoutViewWithCartData(cartData);
			} catch (error) {
				console.error("Failed to update checkout view:", error);
			}
		}

		async updateCheckoutViewWithCartData(cartData) {
			try {
				// Find the checkout items container and empty state
				const checkoutContainer = this.modal.querySelector(
					"[data-checkout-items]"
				);
				const emptyState = this.modal.querySelector("[data-empty-state]");

				if (!checkoutContainer) {
					console.warn("Checkout items container not found");
					return;
				}

				if (cartData.items.length === 0) {
					// Clear all existing items first to ensure clean empty state
					const allExistingItems = checkoutContainer.querySelectorAll(
						".checkout-product-item-wrap, .checkout-products-wrap, .premium-gift-box, [data-item-id]"
					);
					`🧹 Empty cart: Clearing ${allExistingItems.length} existing items to show clean empty state`;
					allExistingItems.forEach((item) => item.remove());

					// Show empty state
					if (emptyState) {
						emptyState.style.display = "block";
					}

					// Hide checkout sections when cart is empty
					this.hideCheckoutSections();

					// Show empty cart message
					this.showEmptyCartMessage();

					// Refresh pricing to show empty cart (£0.00)
					this.updateCheckoutPricing();

					// Reset personalization state when cart becomes empty
					this.state.reset();
					this.calculatePricing().catch(() => {});

					// Stay in checkout view to show empty state - don't switch back to personalize
					("🔄 Cart is empty, staying in checkout view to show empty state");
				} else {
					// Hide empty state
					if (emptyState) {
						emptyState.style.display = "none";
					}

					// Show checkout sections when cart has items
					this.showCheckoutSections();

					// Hide empty cart message
					this.hideEmptyCartMessage();

					// Clear existing items
					const allExistingItems = checkoutContainer.querySelectorAll(
						".checkout-product-item-wrap, .checkout-products-wrap, .premium-gift-box, [data-item-id]"
					);
					allExistingItems.forEach((item) => item.remove());

					// Render new cart items
					await this.renderCartItems(cartData.items, checkoutContainer);

					// Re-bind event handlers for the newly rendered items
					// REMOVED: bindCheckoutItemEvents() - using event delegation instead (line 767)
					// this.bindCheckoutItemEvents();

					// Refresh pricing to reflect the updated cart totals
					this.updateCheckoutPricing();

					// Update progress indicator based on non-gift-box item count
					// DISABLED: Conflicts with multi-currency progress indicator in mini-atc-modal-checkout.liquid
					// The Liquid script has more comprehensive currency support (GBP, AUD, USD)
					// this.updateProgressIndicator(cartData);
				}
			} catch (error) {
				console.error("Failed to update checkout view with cart data:", error);
			}
		}

		/* DISABLED: This method conflicts with the multi-currency progress indicator in mini-atc-modal-checkout.liquid
		 * The Liquid script has more comprehensive features:
		 * - Multi-currency support (GBP £75, AUD $200, USD $14.95)
		 * - Non-destructive DOM updates (toggles visibility instead of innerHTML replacement)
		 * - MutationObserver for real-time updates
		 * - Global cart event listeners
		 *
		 * This old method only supports hardcoded £80 GBP and uses destructive innerHTML replacement.
		 * Keeping both causes race conditions and inconsistent UI states.
		 */
		/*
	updateProgressIndicator(cartData) {
		try {
("🔄 updateProgressIndicator called with cartData:", cartData);
			
			// Count non-gift-box items in the cart
			let nonGiftBoxItemCount = 0;
			
			// Get cart total (in pence/cents) - use total_price (discounted price) for progress calculation
			const cartTotal = cartData && cartData.total_price ? cartData.total_price : 0;
			const cartTotalInPounds = cartTotal / 100;
			
			// Debug: Check all possible total properties
("💰 Cart total_price:", cartData?.total_price);
("💰 Cart original_total_price:", cartData?.original_total_price);
("💰 Cart calculated total:", cartTotalInPounds);

			if (cartData && cartData.items) {
				nonGiftBoxItemCount = cartData.items.filter((item) => {
					// Check if this item is NOT a gift box or gift item
					if (
						item.properties &&
						(item.properties["_Add-on"] === "Premium Gift Box" ||
						 item.properties["_Add-on"] === "Gift Box" ||
						 item.properties["Gift"] === "true" ||
						 item.properties["gift"] === "true" ||
						 item.title && item.title.toLowerCase().includes("gift box") ||
						 item.title && item.title.toLowerCase().includes("gift bag"))
					) {
						return false; // Exclude gift boxes and gift items
					}
					return true; // Include all other items
				}).length;
			}

(
				`📊 Progress Indicator: ${nonGiftBoxItemCount} non-gift-box items in cart, Cart total: £${cartTotalInPounds}`
			);

		// Determine progress based on conditions:
		// Full progress: 2+ items AND cart total >= £80
		// Half progress: cart total >= £80 ONLY (regardless of item count, but not full progress)
		// Zero progress: cart total < £80 (shipping not met, regardless of item count)
		const hasReachedFullProgress = nonGiftBoxItemCount >= 2 && cartTotalInPounds >= 80;
		const hasReachedHalfProgress = cartTotalInPounds >= 80 && !hasReachedFullProgress;

			// Find the progress fill element
			const progressFill = this.modal.querySelector(
				".step-process-indicator__progress-fill"
			);

			if (progressFill) {
				// Remove all progress classes first
				progressFill.classList.remove("progress-full", "progress-half");

				// Add appropriate class based on conditions
				if (hasReachedFullProgress) {
					progressFill.classList.add("progress-full");
(
						"📊 Progress Indicator: Added progress-full class (2+ items AND cart >= £80)"
					);
				} else if (hasReachedHalfProgress) {
					progressFill.classList.add("progress-half");
(
						"📊 Progress Indicator: Added progress-half class (cart >= £80 ONLY)"
					);
				} else {
					// No progress - < 2 items AND cart total < £80
("📊 Progress Indicator: Progress set to 0 (shipping not met - cart < £80)");
				}
			}

		// Update the first step (Free Shipping step)
		const allSteps = this.modal.querySelectorAll(
			".step-process-indicator__step"
		);
("🔍 Found steps:", allSteps.length);
		
		const freeShippingStep = allSteps[1]; // Second step (index 1) - Free Shipping
("🚚 Free Shipping Step:", freeShippingStep);

		// Check if this is the free shipping step by looking for the step-free-shipping class in the circle
		const freeShippingCircle = freeShippingStep ? freeShippingStep.querySelector('.step-free-shipping') : null;
("🚚 Free Shipping Circle:", freeShippingCircle);

		if (freeShippingStep && freeShippingCircle) {
("✅ Processing Free Shipping step...");

			if (cartTotalInPounds >= 80) {
				// Mark step as completed (cart total >= £80)
				freeShippingStep.classList.remove("step-process-indicator__step--active");
				freeShippingStep.classList.add("step-process-indicator__step--completed");

				// Show checkmark SVG
				if (freeShippingCircle) {
					freeShippingCircle.innerHTML = `
				<svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M1 5L5 9L14 1" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
				</svg>
			`;
				}
(
					"📊 Progress Indicator: Free shipping step marked as completed with checkmark (cart total >= £80)"
				);
			} else {
				// Mark step as active (cart total < £80)
				freeShippingStep.classList.remove("step-process-indicator__step--completed");
				freeShippingStep.classList.add("step-process-indicator__step--active");

				// Show truck SVG when shipping not met
				if (freeShippingCircle) {
					freeShippingCircle.innerHTML = `
				<svg fill="#fff" width="15" height="15" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
					<path d="M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z"/>
				</svg>
			`;
				}
(
					"📊 Progress Indicator: Free shipping step marked as active with truck icon (cart total < £80)"
				);
			}
		}

		// Update the third step (£30 OFF step)
		const thirdStep = allSteps[2]; // Third step (index 2)

		if (thirdStep) {
			const thirdStepCircle = thirdStep.querySelector(
				".step-process-indicator__step-circle"
			);

			if (hasReachedFullProgress) {
				// Mark step as completed
				thirdStep.classList.remove("step-process-indicator__step--active");
				thirdStep.classList.add("step-process-indicator__step--completed");

				// Show checkmark SVG
				if (thirdStepCircle) {
					thirdStepCircle.innerHTML = `
				<svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M1 5L5 9L14 1" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
				</svg>
			`;
				}
(
					"📊 Progress Indicator: Third step marked as completed with checkmark (2+ items)"
				);
			} else {
				// Mark step as active
				thirdStep.classList.remove(
					"step-process-indicator__step--completed"
				);
				thirdStep.classList.add("step-process-indicator__step--active");

				// Show pound symbol
				if (thirdStepCircle) {
					thirdStepCircle.innerHTML =
						'<span class="step-process-indicator__pound-symbol">£</span>';
				}
(
					"📊 Progress Indicator: Third step marked as active with pound symbol (<2 items)"
				);
			}
		}

			// Update the header text
			const headerElement = this.modal.querySelector(
				".step-process-indicator__header"
			);

			if (headerElement) {
				if (hasReachedFullProgress) {
					// Show "You've unlock" text
					headerElement.innerHTML =
						"🔥 You've unlock <span>EXTRA £30 OFF</span>";
(
						'📊 Progress Indicator: Header text updated to "You\'ve unlock" (2+ items)'
					);
				} else {
					// Show "You're only 1 CHUUG away" text
					headerElement.innerHTML =
						"🔥 You're only 1 CHUUG away to unlock <span>EXTRA £30 OFF</span>";
(
						'📊 Progress Indicator: Header text updated to "You\'re only 1 CHUUG away" (<2 items)'
					);
				}
			}
		} catch (error) {
			console.error("Failed to update progress indicator:", error);
		}
	}
	*/

		async fetchUpdatedCartData() {
			try {
				const response = await fetch("/cart.js");
				if (!response.ok) {
					throw new Error(`Failed to fetch cart: ${response.status}`);
				}
				return await response.json();
			} catch (error) {
				console.error("Failed to fetch updated cart data:", error);
				return null;
			}
		}

		async renderCartItems(cartItems, container) {
			try {
				"🛒 renderCartItems called with:", cartItems.length, "items";

				("ASDSADSADDS");
				cartItems;

				// Create a temporary container to hold the rendered items
				const tempContainer = document.createElement("div");

				// Render each cart item (order controlled by CONFIG.REVERSE_CART_ORDER)
				if (CONFIG.REVERSE_CART_ORDER) {
					// Reverse order (newest first, like Liquid template)
					for (let i = cartItems.length - 1; i >= 0; i--) {
						const item = cartItems[i];
						"🛒 Rendering item:", item.id, item.product_title;
						const itemElement = await this.renderCartItem(item, cartItems);
						if (itemElement) {
							"🛒 Item element created:", itemElement;
							tempContainer.appendChild(itemElement);
						} else {
							console.warn("🛒 Item element was null for:", item.id);
						}
					}
				} else {
					// Normal order (oldest first)
					for (let i = 0; i < cartItems.length; i++) {
						const item = cartItems[i];
						"🛒 Rendering item:", item.id, item.product_title;
						const itemElement = await this.renderCartItem(item, cartItems);
						if (itemElement) {
							"🛒 Item element created:", itemElement;
							tempContainer.appendChild(itemElement);
						} else {
							console.warn("🛒 Item element was null for:", item.id);
						}
					}
				}

				// Append all items to the main container
				while (tempContainer.firstChild) {
					container.appendChild(tempContainer.firstChild);
				}
			} catch (error) {
				console.error("Failed to render cart items:", error);
			}
		}

		async renderCartItem(item, allCartItems) {
			try {
				"🛒 renderCartItem called for:", item.id, item.product_title;

				// Check if this is an add-on item that should be grouped with a vessel
				const isAddon =
					item.properties &&
					Object.entries(item.properties).some(
						([key, value]) => key === "_Add-on"
					);
				"🛒 Is addon:", isAddon;

				// Only render main vessel items, not add-ons (they'll be rendered within vessel items)
				if (isAddon) {
					"🛒 Skipping addon item:", item.id;
					return null;
				}

				// Create the main wrapper element
				const wrapper = document.createElement("div");
				wrapper.className = "checkout-product-item-wrap";

				// Create the checkout products wrap element
				const itemElement = document.createElement("div");
				itemElement.className = "checkout-products-wrap";
				itemElement.setAttribute("data-item-id", item.id);

				// Create the container
				const container = document.createElement("div");
				container.className = "checkout-products-wrap__container";

				// Create image section
				const imageSection = document.createElement("div");
				imageSection.className = "checkout-products-wrap__image";

				const imageContainer = document.createElement("div");
				imageContainer.className = "checkout-products-wrap__image-container";

				if (item.image) {
					const img = document.createElement("img");
					img.src = item.image;
					img.alt = item.product_title || "";
					img.width = 128;
					img.height = 128;
					img.loading = "lazy";
					img.className = "checkout-products-wrap__product-image";
					imageContainer.appendChild(img);
				} else {
					const placeholder = document.createElement("div");
					placeholder.className = "checkout-products-wrap__placeholder";
					placeholder.innerHTML =
						'<svg class="placeholder-svg" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg"><rect width="525" height="525" fill="#f6f6f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle" dy=".3em">No image</text></svg>';
					imageContainer.appendChild(placeholder);
				}

				imageSection.appendChild(imageContainer);

				// Create details section
				const detailsSection = document.createElement("div");
				detailsSection.className = "checkout-products-wrap__details";

				// Create header with title and delete button
				const header = document.createElement("div");
				header.className = "checkout-products-wrap__header";

				const title = document.createElement("h3");
				title.className = "checkout-products-wrap__title";
				title.textContent = item.product_title || "";

				const deleteBtn = document.createElement("button");
				deleteBtn.type = "button";
				deleteBtn.className = "checkout-products-wrap__delete";
				deleteBtn.setAttribute("data-remove-item", item.key);
				deleteBtn.setAttribute(
					"aria-label",
					`Remove ${item.product_title || ""} from cart`
				);
				deleteBtn.innerHTML = `
					<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M3 6H5H21" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M10 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M14 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				`;

				header.appendChild(title);
				header.appendChild(deleteBtn);

				// Create options section
				const optionsSection = document.createElement("div");
				optionsSection.className = "checkout-products-wrap__options";

				// Add options based on item properties (matching Liquid logic)
				if (
					item.properties &&
					(item.product_title.includes("CHUUG") ||
						item.product_title.includes("Chuug"))
				) {
					let engravingText = "";
					let hasInsulatedCup = false;

					Object.entries(item.properties).forEach(([key, value]) => {
						if (
							key.includes("Engraving") ||
							key.includes("PERSONALISED INITIAL")
						) {
							engravingText = value;
						}
						const keyLower = key.toLowerCase();
						if (
							keyLower.includes("insulated") ||
							keyLower.includes("cup") ||
							keyLower.includes("silver cup")
						) {
							hasInsulatedCup = true;
						}
					});

					if (engravingText) {
						const optionChip = document.createElement("div");
						optionChip.className = "checkout-products-wrap__option-chip";
						optionChip.textContent = `🔨 Engraved Initials, ${engravingText}`;
						optionsSection.appendChild(optionChip);
					}

					if (hasInsulatedCup) {
						const optionChip = document.createElement("div");
						optionChip.className = "checkout-products-wrap__option-chip";
						optionChip.textContent = "🍺 Silver Insulated Cup";
						optionsSection.appendChild(optionChip);
					}
				}

				// Add-on Products Section (matching Liquid logic)
				const currentVesselNumber = this.extractVesselNumber(item);

				// Find add-on for this vessel
				if (currentVesselNumber) {
					const currentItemIndex = allCartItems.findIndex(
						(cartItem) => cartItem.id === item.id
					);
					if (
						currentItemIndex !== -1 &&
						currentItemIndex < allCartItems.length - 1
					) {
						const nextItem = allCartItems[currentItemIndex + 1];
						if (nextItem && nextItem.properties) {
							const isAddonForVessel =
								Object.entries(nextItem.properties).some(
									([key, value]) =>
										key === "_Add-on" && value === "Premium Gift Box"
								) &&
								Object.entries(nextItem.properties).some(
									([key, value]) =>
										key === "_Vessel Number" && value === currentVesselNumber
								);

							if (isAddonForVessel) {
								const addonSection = document.createElement("div");
								addonSection.className = "checkout-products-wrap__addon";

								const addonItem = document.createElement("div");
								addonItem.className = "checkout-products-wrap__addon-item";

								const addonIcon = document.createElement("div");
								addonIcon.className = "checkout-products-wrap__addon-icon";
								addonIcon.textContent = "🎁";

								const addonDetails = document.createElement("div");
								addonDetails.className =
									"checkout-products-wrap__addon-details";

								const addonTitle = document.createElement("span");
								addonTitle.className = "checkout-products-wrap__addon-title";
								addonTitle.textContent = "Premium Gift Box";

								const addonPrice = document.createElement("span");
								addonPrice.className = "checkout-products-wrap__addon-price";
								addonPrice.textContent = this.formatMoney(
									nextItem.final_price || nextItem.price
								);

								addonDetails.appendChild(addonTitle);
								addonDetails.appendChild(addonPrice);

								const addonRemove = document.createElement("button");
								addonRemove.type = "button";
								addonRemove.className = "checkout-products-wrap__addon-remove";
								addonRemove.setAttribute("data-remove-item", nextItem.key);
								addonRemove.setAttribute(
									"aria-label",
									"Remove Premium Gift Box from cart"
								);
								addonRemove.innerHTML = `
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M2 4H3H13" stroke="#969393" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M5 4V3C5 2.44772 5.44772 2 6 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H4C3.44772 14 3 13.5523 3 13V4H12Z" stroke="#969393" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M7 7V11" stroke="#969393" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M9 7V11" stroke="#969393" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								`;

								addonItem.appendChild(addonIcon);
								addonItem.appendChild(addonDetails);
								addonItem.appendChild(addonRemove);
								addonSection.appendChild(addonItem);

								// Add addon section to details
								detailsSection.appendChild(addonSection);
							}
						}
					}
				}

				// Create pricing section
				const pricingSection = document.createElement("div");
				pricingSection.className = "checkout-products-wrap__pricing";

				const currentPrice = document.createElement("span");
				currentPrice.className = "checkout-products-wrap__current-price";
				currentPrice.textContent = this.formatMoney(
					item.final_price || item.price
				);

				pricingSection.appendChild(currentPrice);

				// If there's a discount, show original price
				if (item.original_price && item.original_price !== item.final_price) {
					const originalPrice = document.createElement("span");
					originalPrice.className = "checkout-products-wrap__original-price";
					originalPrice.textContent = this.formatMoney(item.original_price);
					pricingSection.appendChild(originalPrice);
				}

				// Assemble the details section
				detailsSection.appendChild(header);
				detailsSection.appendChild(optionsSection);
				detailsSection.appendChild(pricingSection);

				// Assemble the container
				container.appendChild(imageSection);
				container.appendChild(detailsSection);

				// Assemble the item element
				itemElement.appendChild(container);
				wrapper.appendChild(itemElement);

				// Always render gift box section below each product item
				// Fetch gift box product data from API
				const giftBoxProductId = "15099649098107";
				const giftBoxData = await this.fetchProductData(giftBoxProductId);
				
				// Create gift box section using the same structure as Liquid template
						const giftBoxSection = document.createElement("div");
						giftBoxSection.className = "premium-gift-box";

						const giftBoxContainer = document.createElement("div");
						giftBoxContainer.className = "premium-gift-box__container";

						// Product Image
						const giftBoxImage = document.createElement("div");
						giftBoxImage.className = "premium-gift-box__image";

							const img = document.createElement("img");
				if (giftBoxData && giftBoxData.images && giftBoxData.images.length > 0) {
					img.src = giftBoxData.images[0].src;
					img.alt = giftBoxData.title || "Premium Gift Box & Wrap";
						} else {
							img.src = "/assets/premium-gift-box.png"; // Fallback image
							img.alt = "Premium Gift Box & Wrap";
				}
							img.width = 71;
							img.height = 89;
				img.loading = "lazy";
				img.setAttribute("data-gift-box-image", "");
							giftBoxImage.appendChild(img);

						// Content Area
						const giftBoxContent = document.createElement("div");
						giftBoxContent.className = "premium-gift-box__content";

						const giftBoxDetails = document.createElement("div");
						giftBoxDetails.className = "premium-gift-box__details";

						const giftBoxText = document.createElement("div");
						giftBoxText.className = "premium-gift-box__text";

				const giftBoxTitle = document.createElement("h6");
						giftBoxTitle.className = "premium-gift-box__title";
				giftBoxTitle.setAttribute("data-gift-box-title", "");
				if (giftBoxData) {
					giftBoxTitle.innerHTML = giftBoxData.title ;
				} else {
					giftBoxTitle.innerHTML = "Premium Gift Box & Tissue Wrap";
				}

						const giftBoxPrice = document.createElement("div");
						giftBoxPrice.className = "premium-gift-box__price";
				giftBoxPrice.setAttribute("aria-label", "Gift box price");
				giftBoxPrice.setAttribute("data-gift-box-price", "");

				// Use API data for price or fallback
				if (giftBoxData && giftBoxData.variants && giftBoxData.variants.length > 0) {
					const variant = giftBoxData.variants[0];
					giftBoxPrice.setAttribute("data-price", variant.price);
					// Convert price from string to cents (multiply by 100)
					const priceInCents = Math.round(parseFloat(variant.price) * 100);
					giftBoxPrice.textContent = this.formatMoney(priceInCents);
				} else {
					giftBoxPrice.setAttribute("data-price", "200");
					giftBoxPrice.textContent = this.formatMoney(200); // £2.00 fallback
				}

				// Error div
				const giftBoxError = document.createElement("div");
				giftBoxError.className = "premium-gift-box__error";
				giftBoxError.setAttribute("data-gift-box-error", "");
				giftBoxError.style.display = "none";
				giftBoxError.style.color = "red";
				giftBoxError.style.fontSize = "12px";
				giftBoxError.style.marginTop = "5px";

						giftBoxText.appendChild(giftBoxTitle);
						giftBoxDetails.appendChild(giftBoxText);
						giftBoxDetails.appendChild(giftBoxPrice);
				giftBoxDetails.appendChild(giftBoxError);

						// Toggle Section
				const giftBoxToggleSection = document.createElement("div");
				giftBoxToggleSection.className = "premium-gift-box__toggle-section";

				const giftBoxToggleContainer = document.createElement("div");
				giftBoxToggleContainer.className = "premium-gift-box__toggle-container";

				// Create unique ID for this product's gift box toggle
				const uniqueToggleId = `premium-gift-box-toggle-${item.id}`;
				
				const giftBoxToggleLabel = document.createElement("label");
				giftBoxToggleLabel.className = "premium-gift-box__toggle";
				giftBoxToggleLabel.setAttribute("for", uniqueToggleId);

				const giftBoxToggleInput = document.createElement("input");
				giftBoxToggleInput.type = "checkbox";
				giftBoxToggleInput.id = uniqueToggleId;
				giftBoxToggleInput.className = "premium-gift-box__toggle-input";
				giftBoxToggleInput.setAttribute("data-addon-toggle", "gift-box");
				giftBoxToggleInput.setAttribute("data-property", "properties[Premium Gift Box]");
				giftBoxToggleInput.setAttribute("data-vessel-id", item.id); // Link to the main product
				
				// Set variant data attributes
				if (giftBoxData && giftBoxData.variants && giftBoxData.variants.length > 0) {
					const variant = giftBoxData.variants[0];
					giftBoxToggleInput.setAttribute("data-variant-id", variant.id);
					giftBoxToggleInput.setAttribute("data-gift-box-variant-id", variant.id);
					giftBoxToggleInput.setAttribute("data-gift-box-product-title", giftBoxData.title);
				} else {
					// Use hardcoded variant ID as fallback
					const fallbackVariantId = "55511131455867"; // From the API data you provided
					giftBoxToggleInput.setAttribute("data-variant-id", fallbackVariantId);
					giftBoxToggleInput.setAttribute("data-gift-box-variant-id", fallbackVariantId);
					giftBoxToggleInput.setAttribute("data-gift-box-product-title", "Premium Gift Box and Tissue Wrap");
				}

				const giftBoxToggleSlider = document.createElement("span");
				giftBoxToggleSlider.className = "premium-gift-box__toggle-slider";
				giftBoxToggleSlider.setAttribute("aria-hidden", "true");

				const giftBoxToggleHidden = document.createElement("span");
				giftBoxToggleHidden.className = "visually-hidden";
				giftBoxToggleHidden.textContent = "Add premium gift box to order";

				giftBoxToggleLabel.appendChild(giftBoxToggleInput);
				giftBoxToggleLabel.appendChild(giftBoxToggleSlider);
				giftBoxToggleLabel.appendChild(giftBoxToggleHidden);

				giftBoxToggleContainer.appendChild(giftBoxToggleLabel);
				giftBoxToggleSection.appendChild(giftBoxToggleContainer);

				giftBoxContent.appendChild(giftBoxDetails);
				giftBoxContent.appendChild(giftBoxToggleSection);

				// Check if gift box is already in cart for this vessel and set toggle state
				// Use setTimeout to ensure this runs after the DOM is fully rendered
				setTimeout(async () => {
					try {
						const cartResponse = await fetch('/cart.js');
						const cart = await cartResponse.json();
						
						const existingGiftBox = cart.items.find(cartItem => 
							cartItem.properties && 
							cartItem.properties['_Add-on'] === 'Premium Gift Box' &&
							cartItem.properties['_Vessel Number'] === item.id.toString()
						);
						
						if (existingGiftBox) {
							giftBoxToggleInput.checked = true;
						} else {
							giftBoxToggleInput.checked = false;
						}
					} catch (error) {
						giftBoxToggleInput.checked = false;
					}
				}, 100); // Small delay to ensure DOM is ready

				// Add event listener for gift box toggle
				giftBoxToggleInput.addEventListener('change', async (event) => {
					const isChecked = event.target.checked;
					const vesselId = event.target.getAttribute('data-vessel-id');
					const variantId = event.target.getAttribute('data-variant-id');
					
					
					try {
						if (isChecked) {
							// Add gift box to cart
							
							// Create gift box data
							const giftBoxData = {
								id: variantId,
								quantity: 1,
								properties: {
									// HIDDEN PROPERTIES (for backend use only)
									"_Monogram Initials": "N/A",
									"_Premium Gift Box & Tissue Wrap": "Premium Gift Box & Tissue Wrap",
									"_Add-on": "Premium Gift Box",
									"_Product Handle": "premium-gift-box-tissue-wrap",
									"_Vessel Number": vesselId,
									"_Unique Line ID": `${Date.now()}-GB${vesselId}-${Math.random().toString(36).substr(2, 9)}`,
								}
							};
							
							const response = await fetch('/cart/add.js', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify(giftBoxData)
							});
							
							if (response.ok) {
								// Update product properties to show gift box info
								await this.updateProductGiftBoxProperties(vesselId, true);
								// Update cart icon bubble and total price
								await this.updateCartIconBubbleWithSections();
								// Update checkout pricing to reflect new total
								this.updateCheckoutPricing();
							} else {
								// Show error message
								giftBoxError.textContent = 'Failed to add gift box. Please try again.';
								giftBoxError.style.display = 'block';
								// Uncheck the toggle
								event.target.checked = false;
							}
						} else {
							// Remove gift box from cart using change API
							
							// Find and remove the gift box item
							const cartResponse = await fetch('/cart.js');
							const cart = await cartResponse.json();
							
							const giftBoxItem = cart.items.find(cartItem => 
								cartItem.properties && 
								cartItem.properties['_Add-on'] === 'Premium Gift Box' &&
								cartItem.properties['_Vessel Number'] === vesselId
							);
							
							if (giftBoxItem) {
								const removeResponse = await fetch('/cart/change.js', {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										id: giftBoxItem.key,
										quantity: 0
									})
								});
								
								if (removeResponse.ok) {
									// Update product properties to remove gift box info
									await this.updateProductGiftBoxProperties(vesselId, false);
									// Update cart icon bubble and total price
									await this.updateCartIconBubbleWithSections();
									// Update checkout pricing to reflect new total
									this.updateCheckoutPricing();
								} else {
									// Show error message
									giftBoxError.textContent = 'Failed to remove gift box. Please try again.';
									giftBoxError.style.display = 'block';
									// Re-check the toggle
									event.target.checked = true;
								}
							}
						}
					} catch (error) {
						giftBoxError.textContent = 'An error occurred. Please try again.';
						giftBoxError.style.display = 'block';
						// Reset toggle state
						event.target.checked = !isChecked;
					}
				});

						giftBoxContainer.appendChild(giftBoxImage);
						giftBoxContainer.appendChild(giftBoxContent);
						giftBoxSection.appendChild(giftBoxContainer);

						// Add gift box section to wrapper
						wrapper.appendChild(giftBoxSection);

				// Return the wrapper with gift box included
				return wrapper;
			} catch (error) {
				console.error("Failed to render cart item:", error);
				return null;
			}
		}

		formatMoney(cents) {
			// Use CurrencyManager if available, otherwise fallback to GBP
			if (window.CurrencyManager) {
				return window.CurrencyManager.formatPrice(cents);
			}
			// Fallback to hardcoded GBP if CurrencyManager not available
			const amount = (cents / 100).toFixed(2);
			return `£${amount}`;
		}

		resetPersonalizationToggles() {
			// Reset engraving toggle to true (default state)
			const engravingToggle = this.modal.querySelector(
				'[data-personalization-toggle="engraving"]'
			);
			if (engravingToggle) {
				engravingToggle.checked = true;
			}

			// Reset all other personalization toggles to false
			const otherToggles = this.modal.querySelectorAll(
				'[data-personalization-toggle]:not([data-personalization-toggle="engraving"])'
			);
			otherToggles.forEach((toggle) => {
				toggle.checked = false;
			});
		}

		resetGiftBoxToggle() {
			// Reset gift box toggle to false (default state)
			const giftBoxToggle = this.modal.querySelector(
				".mini-atc-modal--gift-box-toggle"
			);
			if (giftBoxToggle) {
				giftBoxToggle.checked = false;
			}

			// Also reset any gift box toggle slider
			const giftBoxToggleSlider = this.modal.querySelector(
				".premium-gift-box__toggle-slider"
			);
			if (giftBoxToggleSlider) {
				// Find the associated checkbox input
				const checkbox = giftBoxToggleSlider
					.closest(".premium-gift-box")
					.querySelector('input[type="checkbox"]');
				if (checkbox) {
					checkbox.checked = false;
				}
			}
		}

		extractVesselNumber(item) {
			// Extract vessel number from item properties
			// Look for properties like "_Vessel 1 Product", "_Vessel 2 Product", etc.
			`🔍 DEBUG: Extracting vessel number for item ${item.id}:`,
				item.properties;

			if (item.properties) {
				for (const [key, value] of Object.entries(item.properties)) {
					`🔍 DEBUG: Checking property: ${key} = ${value}`;

					// First, check for direct "_Vessel Number" property (used by gift boxes and some items)
					if (key === "_Vessel Number") {
						const vesselNum = value.toString();
						`🔍 DEBUG: Found direct vessel number: ${vesselNum}`;
						return vesselNum;
					}
					// Then look for properties like "_Vessel 1 Product", "_Vessel 2 Product", etc. (used by main products)
					else if (key.includes("Vessel") && key.includes("Product")) {
						const parts = key.split(" ");
						`🔍 DEBUG: Found vessel property, parts:`, parts;
						if (parts.length >= 2) {
							const vesselNum = parts[1];
							`🔍 DEBUG: Extracted vessel number from product property: ${vesselNum}`;
							return vesselNum; // Return the vessel number
						}
					}
				}
			}
			`🔍 DEBUG: No vessel number found for item ${item.id}`;
			return null;
		}

		async findAssociatedGiftBoxesFromCartData(vesselItemKey, cartData) {
			try {
				`🔍 DEBUG: Starting cleanup for vessel item with key ${vesselItemKey}`;

				if (!cartData || !cartData.items) {
					`🔍 DEBUG: No cart data or items found`;
					return [];
				}

				`🔍 DEBUG: Cart has ${cartData.items.length} items`;
				`🔍 DEBUG: All cart items:`,
					cartData.items.map((item) => ({
						key: item.key,
						id: item.id,
						title: item.product_title,
						properties: item.properties,
					}));

				// Find the vessel item to get its vessel number
				const vesselItem = cartData.items.find(
					(item) => item.key === vesselItemKey
				);
				if (!vesselItem) {
					`🔍 DEBUG: Vessel item with key ${vesselItemKey} not found in cart`;
					`🔍 DEBUG: Available item keys:`,
						cartData.items.map((item) => item.key);
					return [];
				}

				`🔍 DEBUG: Found vessel item:`,
					{
						key: vesselItem.key,
						id: vesselItem.id,
						title: vesselItem.product_title,
						properties: vesselItem.properties,
					};

				// Extract vessel number AND unique line ID timestamp from the vessel item's properties
				let vesselNumber = null;
				let vesselUniqueLineId = null;
				`🔍 DEBUG: Vessel item properties:`, vesselItem.properties;

				// Properties are stored as an object, not an array
				for (const [key, value] of Object.entries(
					vesselItem.properties || {}
				)) {
					`🔍 DEBUG: Checking property key: ${key}, value: ${value}`;

					// First, check for direct "_Vessel Number" property (used by gift boxes and some items)
					if (key === "_Vessel Number") {
						vesselNumber = value.toString();
						`🔍 DEBUG: Found direct vessel number: ${vesselNumber}`;
					}
					// Then look for properties like "_Vessel 2 Product", "_Vessel 1 Product", etc. (used by main products)
					else if (key.includes("Vessel") && key.includes("Product")) {
						// Extract number from property name like "_Vessel 2 Product"
						const vesselPropertyParts = key.split(" ");
						if (vesselPropertyParts.length >= 2) {
							vesselNumber = vesselPropertyParts[1];
							`🔍 DEBUG: Found vessel number from product property: ${vesselNumber}`;
						}
					}
					// Get the unique line ID to match the timestamp
					if (key === "_Unique Line ID") {
						vesselUniqueLineId = value;
						`🔍 DEBUG: Found unique line ID: ${vesselUniqueLineId}`;
					}
				}

				if (!vesselNumber) {
					`🔍 DEBUG: No vessel number found for item with key ${vesselItemKey}`;
					`🔍 DEBUG: Available properties:`, vesselItem.properties;
					return [];
				}

				if (!vesselUniqueLineId) {
					`🔍 DEBUG: No unique line ID found for item with key ${vesselItemKey}`;
					`🔍 DEBUG: Available properties:`, vesselItem.properties;
					return [];
				}

				// Extract the timestamp prefix from the unique line ID
				// Handle different formats: "BUNDLE-1-charcoal-engraved-1760363090569" or "1760363090570-GB1-9wv1allbt"
				let vesselTimestampPrefix = null;
				if (vesselUniqueLineId.startsWith("BUNDLE-")) {
					// For BUNDLE format: "BUNDLE-1-charcoal-engraved-1760363090569"
					const parts = vesselUniqueLineId.split("-");
					vesselTimestampPrefix = parts[parts.length - 1]; // Get the last part (timestamp)
				} else {
					// For regular format: "1760363090570-GB1-9wv1allbt"
					vesselTimestampPrefix = vesselUniqueLineId.split("-")[0];
				}
				`🔍 DEBUG: Looking for gift boxes associated with vessel number ${vesselNumber} and timestamp prefix ${vesselTimestampPrefix}`;

				// Find gift boxes with matching vessel number AND timestamp prefix
				const associatedGiftBoxKeys = [];
				for (const item of cartData.items) {
					if (item.key === vesselItemKey) {
						continue; // Skip the vessel item itself
					}

					`🔍 DEBUG: Checking item ${item.key}:`,
						{
							title: item.product_title,
							properties: item.properties,
						};

					// Check if this item is a gift box
					let isGiftBox = false;
					let hasMatchingVesselNumber = false;
					let hasMatchingTimestamp = false;

					// Properties are stored as an object, not an array
					for (const [key, value] of Object.entries(item.properties || {})) {
						`🔍 DEBUG: Checking gift box property key: ${key}, value: ${value}`;

						// Check if it's a gift box
						if (key === "_Add-on" && value === "Premium Gift Box") {
							isGiftBox = true;
							`🔍 DEBUG: Item ${item.key} is a gift box`;
						}

						// Check if it has the matching vessel number
						if (
							key === "_Vessel Number" &&
							value.toString() === vesselNumber.toString()
						) {
							hasMatchingVesselNumber = true;
							`🔍 DEBUG: Item ${item.key} has matching vessel number ${vesselNumber}`;
						}

						// Check if it has the matching timestamp prefix in the unique line ID
						if (key === "_Unique Line ID") {
							let giftBoxTimestampPrefix = null;
							if (value.startsWith("BUNDLE-")) {
								// For BUNDLE format: "BUNDLE-1-charcoal-engraved-1760363090569"
								const parts = value.split("-");
								giftBoxTimestampPrefix = parts[parts.length - 1]; // Get the last part (timestamp)
							} else {
								// For regular format: "1760363090570-GB1-9wv1allbt"
								giftBoxTimestampPrefix = value.split("-")[0];
							}

							// Allow for small timestamp differences (within 10 seconds) to handle timing issues
							const vesselTimestamp = parseInt(vesselTimestampPrefix);
							const giftBoxTimestamp = parseInt(giftBoxTimestampPrefix);
							const timeDifference = Math.abs(
								vesselTimestamp - giftBoxTimestamp
							);

							if (
								giftBoxTimestampPrefix === vesselTimestampPrefix ||
								timeDifference <= 10000
							) {
								hasMatchingTimestamp = true;
								`🔍 DEBUG: Item ${item.key} has matching timestamp prefix ${giftBoxTimestampPrefix} (difference: ${timeDifference}ms)`;
							} else {
								`🔍 DEBUG: Item ${item.key} has different timestamp prefix ${giftBoxTimestampPrefix} (expected ${vesselTimestampPrefix}, difference: ${timeDifference}ms)`;
							}
						}
					}

					// If it's a gift box with matching vessel number AND matching timestamp, add to removal list
					if (isGiftBox && hasMatchingVesselNumber && hasMatchingTimestamp) {
						// Use the key for cart API
						associatedGiftBoxKeys.push(item.key);
						`🔍 DEBUG: Found associated gift box with key ${item.key} (id: ${item.id}) for vessel ${vesselNumber} with matching timestamp`;
					} else if (
						isGiftBox &&
						hasMatchingVesselNumber &&
						!hasMatchingTimestamp
					) {
						`🔍 DEBUG: Skipping gift box ${item.key} - vessel number matches but timestamp doesn't`;
					}
				}

				`🔍 DEBUG: Found ${associatedGiftBoxKeys.length} associated gift boxes:`,
					associatedGiftBoxKeys;
				return associatedGiftBoxKeys;
			} catch (error) {
				console.error("🔍 DEBUG: Failed to find associated gift boxes:", error);
				return [];
			}
		}

		async findAssociatedGiftBoxes(vesselItemId) {
			try {
				`🔍 DEBUG: Starting cleanup for vessel item ${vesselItemId}`;

				// Fetch current cart data
				const cartData = await this.fetchUpdatedCartData();
				if (!cartData || !cartData.items) {
					`🔍 DEBUG: No cart data or items found`;
					return [];
				}

				`🔍 DEBUG: Cart has ${cartData.items.length} items`;
				`🔍 DEBUG: All cart items:`,
					cartData.items.map((item) => ({
						id: item.id,
						title: item.product_title,
						properties: item.properties,
					}));

				// Find the vessel item to get its vessel number
				const vesselItem = cartData.items.find(
					(item) => item.id.toString() === vesselItemId.toString()
				);
				if (!vesselItem) {
					`🔍 DEBUG: Vessel item ${vesselItemId} not found in cart`;
					`🔍 DEBUG: Available item IDs:`,
						cartData.items.map((item) => item.id);
					return [];
				}

				`🔍 DEBUG: Found vessel item:`,
					{
						id: vesselItem.id,
						title: vesselItem.product_title,
						properties: vesselItem.properties,
					};

				// Extract vessel number AND unique line ID timestamp from the vessel item's properties
				let vesselNumber = null;
				let vesselUniqueLineId = null;
				`🔍 DEBUG: Vessel item properties:`, vesselItem.properties;

				// Properties are stored as an object, not an array
				for (const [key, value] of Object.entries(
					vesselItem.properties || {}
				)) {
					`🔍 DEBUG: Checking property key: ${key}, value: ${value}`;
					// Look for properties like "_Vessel 2 Product", "_Vessel 1 Product", etc.
					if (key.includes("Vessel") && key.includes("Product")) {
						// Extract number from property name like "_Vessel 2 Product"
						const vesselPropertyParts = key.split(" ");
						if (vesselPropertyParts.length >= 2) {
							vesselNumber = vesselPropertyParts[1];
							`🔍 DEBUG: Found vessel number: ${vesselNumber}`;
						}
					}
					// Get the unique line ID to match the timestamp
					if (key === "_Unique Line ID") {
						vesselUniqueLineId = value;
						`🔍 DEBUG: Found unique line ID: ${vesselUniqueLineId}`;
					}
				}

				if (!vesselNumber) {
					`🔍 DEBUG: No vessel number found for item ${vesselItemId}`;
					`🔍 DEBUG: Available properties:`, vesselItem.properties;
					return [];
				}

				if (!vesselUniqueLineId) {
					`🔍 DEBUG: No unique line ID found for item ${vesselItemId}`;
					`🔍 DEBUG: Available properties:`, vesselItem.properties;
					return [];
				}

				// Extract the timestamp prefix from the unique line ID (e.g., "1759401169659" from "1759401169659-V1-26bfsczov")
				const vesselTimestampPrefix = vesselUniqueLineId.split("-")[0];
				`🔍 DEBUG: Looking for gift boxes associated with vessel number ${vesselNumber} and timestamp prefix ${vesselTimestampPrefix}`;

				// Find gift boxes with matching vessel number AND timestamp prefix
				const associatedGiftBoxIds = [];
				for (const item of cartData.items) {
					if (item.id.toString() === vesselItemId.toString()) {
						continue; // Skip the vessel item itself
					}

					`🔍 DEBUG: Checking item ${item.id}:`,
						{
							title: item.product_title,
							properties: item.properties,
						};

					// Check if this item is a gift box
					let isGiftBox = false;
					let hasMatchingVesselNumber = false;
					let hasMatchingTimestamp = false;

					// Properties are stored as an object, not an array
					for (const [key, value] of Object.entries(item.properties || {})) {
						`🔍 DEBUG: Checking gift box property key: ${key}, value: ${value}`;

						// Check if it's a gift box
						if (key === "_Add-on" && value === "Premium Gift Box") {
							isGiftBox = true;
							`🔍 DEBUG: Item ${item.id} is a gift box`;
						}

						// Check if it has the matching vessel number
						if (
							key === "_Vessel Number" &&
							value.toString() === vesselNumber.toString()
						) {
							hasMatchingVesselNumber = true;
							`🔍 DEBUG: Item ${item.id} has matching vessel number ${vesselNumber}`;
						}

						// Check if it has the matching timestamp prefix in the unique line ID
						if (key === "_Unique Line ID") {
							const giftBoxTimestampPrefix = value.split("-")[0];
							if (giftBoxTimestampPrefix === vesselTimestampPrefix) {
								hasMatchingTimestamp = true;
								`🔍 DEBUG: Item ${item.id} has matching timestamp prefix ${giftBoxTimestampPrefix}`;
							} else {
								`🔍 DEBUG: Item ${item.id} has different timestamp prefix ${giftBoxTimestampPrefix} (expected ${vesselTimestampPrefix})`;
							}
						}
					}

					// If it's a gift box with matching vessel number AND matching timestamp, add to removal list
					if (isGiftBox && hasMatchingVesselNumber && hasMatchingTimestamp) {
						// Use the key instead of id for cart API
						associatedGiftBoxIds.push(item.key);
						`🔍 DEBUG: Found associated gift box with key ${item.key} (id: ${item.id}) for vessel ${vesselNumber} with matching timestamp`;
					} else if (
						isGiftBox &&
						hasMatchingVesselNumber &&
						!hasMatchingTimestamp
					) {
						`🔍 DEBUG: Skipping gift box ${item.key} - vessel number matches but timestamp doesn't`;
					}
				}

				`🔍 DEBUG: Found ${associatedGiftBoxIds.length} associated gift boxes:`,
					associatedGiftBoxIds;
				return associatedGiftBoxIds;
			} catch (error) {
				console.error("🔍 DEBUG: Failed to find associated gift boxes:", error);
				return [];
			}
		}

		// REMOVED: bindCheckoutItemEvents() - using event delegation instead (see line 767)
		// This method was causing duplicate event listeners and multiple removal attempts
		// The global event delegation listener on the modal handles all remove button clicks
		// bindCheckoutItemEvents() {
		// 	// Re-bind remove item events for dynamically loaded content
		// 	const removeButtons = this.modal.querySelectorAll("[data-remove-item]");
		// 	removeButtons.forEach((button) => {
		// 		button.addEventListener("click", (event) => {
		// 			event.preventDefault();
		// 			const itemId = button.getAttribute("data-remove-item");
		// 			if (itemId) {
		// 				this.removeCartItem(itemId);
		// 			}
		// 		});
		// 	});
		// }

		// REMOVED: renderCheckoutItemsWithBetterData and related functions - using Liquid templates instead

		// REMOVED: isGiftBoxItem, renderCheckoutItem, renderItemProperties, renderGiftBoxItem - using Liquid templates instead

		async removeCartItem(itemKey) {
			`🗑️ REMOVE ITEM: Starting removal of item with key ${itemKey}`;

			// Prevent multiple simultaneous removal attempts
			if (this.isRemovingItem) {
				console.warn("Item removal already in progress");
				return;
			}

			try {
				this.isRemovingItem = true;

				// Show loading overlay
				this.showRemoveItemLoader();

				let cartData;

				// Handle special gift box case
				if (itemKey === "gift-box") {
					// Use the existing gift box removal method if available
					if (
						window.cartManager &&
						typeof window.cartManager.removeGiftBox === "function"
					) {
						await window.cartManager.removeGiftBox();
						// Fetch updated cart data
						cartData = await this.fetchUpdatedCartData();

						// Fetch the cart icon bubble section separately
						const sectionUrl = `${window.location.pathname}?sections=cart-icon-bubble`;
						try {
							const sectionResponse = await fetch(sectionUrl);
							if (sectionResponse.ok) {
								const sectionData = await sectionResponse.json();
								// Create a response object with sections for updateCartIconBubble
								const responseWithSections = {
									...cartData,
									sections: sectionData,
								};
								this.updateCartIconBubble(responseWithSections);
							}
						} catch (error) {
							console.warn("Failed to fetch cart icon bubble section:", error);
						}

						// Update checkout view
						await this.updateCheckoutViewWithCartData(cartData);
						cartData.checkoutViewAlreadyUpdated = true;
					} else {
						console.warn("Gift box removal method not available");
						return;
					}
				} else {
					`🗑️ REMOVE ITEM: Processing item removal for key ${itemKey}`;

					// Get current cart data to check if this is a gift box item
					const currentCartData = await this.fetchUpdatedCartData();
					const itemToRemove = currentCartData.items.find(
						(item) => item.key === itemKey
					);

					// Check if this is a gift box item
					const isGiftBoxItem =
						itemToRemove &&
						itemToRemove.properties &&
						Object.entries(itemToRemove.properties).some(
							([key, value]) =>
								key === "_Add-on" && value === "Premium Gift Box"
						);

					if (isGiftBoxItem) {
						`🎁 Removing gift box item with key ${itemKey} directly`;
						// For gift box items, remove only this specific item using the key as id
						const response = await fetch("/cart/change.js", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Accept: "application/json",
							},
							body: JSON.stringify({
								id: itemKey,
								quantity: 0,
								sections: "cart-icon-bubble",
								sections_url: window.location.pathname,
							}),
						});

						if (!response.ok) {
							throw new Error(
								`Failed to remove gift box item: ${response.status}`
							);
						}

						cartData = await response.json();

						// Update cart icon bubble immediately with the response that has sections
						this.updateCartIconBubble(cartData);

						// Update checkout view for gift box removal
						await this.updateCheckoutViewWithCartData(cartData);
						cartData.checkoutViewAlreadyUpdated = true;
					} else {
						`🗑️ REMOVE ITEM: Processing vessel item removal for key ${itemKey}`;

						// Find associated gift boxes BEFORE removing the main item
						const associatedGiftBoxKeys =
							await this.findAssociatedGiftBoxesFromCartData(
								itemKey,
								currentCartData
							);

						`🗑️ REMOVE ITEM: Found ${associatedGiftBoxKeys.length} associated gift boxes to remove:`,
							associatedGiftBoxKeys;

						// Remove the main item first using the key as id
						const response = await fetch("/cart/change.js", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Accept: "application/json",
							},
							body: JSON.stringify({
								id: itemKey,
								quantity: 0,
								sections: "cart-icon-bubble",
								sections_url: window.location.pathname,
							}),
						});

						if (!response.ok) {
							throw new Error(`Failed to remove item: ${response.status}`);
						}

						cartData = await response.json();

						// Update cart icon bubble immediately with the response that has sections
						this.updateCartIconBubble(cartData);

						// Remove associated gift boxes
						if (associatedGiftBoxKeys.length > 0) {
							`🎁 Removing ${associatedGiftBoxKeys.length} associated gift boxes`;
							`🎁 Gift box keys to remove:`, associatedGiftBoxKeys;

							for (const giftBoxKey of associatedGiftBoxKeys) {
								`🎁 Attempting to remove gift box with key: ${giftBoxKey}`;
								`🎁 Request body:`,
									JSON.stringify({
										id: giftBoxKey,
										quantity: 0,
										sections: "cart-icon-bubble",
										sections_url: window.location.pathname,
									});
								try {
									const giftBoxResponse = await fetch("/cart/change.js", {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
											Accept: "application/json",
										},
										body: JSON.stringify({
											id: giftBoxKey,
											quantity: 0,
											sections: "cart-icon-bubble",
											sections_url: window.location.pathname,
										}),
									});

									`🎁 Gift box removal response status:`,
										giftBoxResponse.status;

									if (giftBoxResponse.ok) {
										const responseData = await giftBoxResponse.json();
										`✅ Removed gift box ${giftBoxKey}`, responseData;

										// Update cart icon bubble with the latest response
										this.updateCartIconBubble(responseData);

										// Update cartData to the latest response for final checkout view update
										cartData = responseData;
									} else {
										const errorText = await giftBoxResponse.text();
										console.warn(
											`⚠️ Failed to remove gift box ${giftBoxKey}: ${giftBoxResponse.status}`,
											errorText
										);
									}
								} catch (giftBoxError) {
									console.error(
										`❌ Error removing gift box ${giftBoxKey}:`,
										giftBoxError
									);
								}
							}

							`🎁 Finished removing gift boxes, fetching updated cart data...`;
							// Fetch updated cart data after removing gift boxes (for checkout view update)
							const updatedCartData = await this.fetchUpdatedCartData();
							`🎁 Updated cart data:`, updatedCartData;

							// Use updated cart data for checkout view and replace cartData
							if (updatedCartData) {
								// Update checkout view with fresh data
								await this.updateCheckoutViewWithCartData(updatedCartData);
								// Don't update again below, so set a flag or return early
								cartData = updatedCartData;
								cartData.checkoutViewAlreadyUpdated = true;
							}
						} else {
							`🎁 No gift boxes to remove`;
							// Update checkout view for single item removal (no gift boxes)
							await this.updateCheckoutViewWithCartData(cartData);
							cartData.checkoutViewAlreadyUpdated = true;
						}
					}
				}

				// Update the checkout view with the new cart state (if not already updated above)
				if (!cartData.checkoutViewAlreadyUpdated) {
					if (!cartData.sections || !cartData.sections["cart-icon-bubble"]) {
						// cartData was fetched without sections, update checkout view normally
						await this.updateCheckoutView(cartData);
					} else {
						// cartData has sections, just update checkout view without re-fetching
						await this.updateCheckoutViewWithCartData(cartData);
					}
				}
			} catch (error) {
				console.error("Failed to remove cart item:", error);
				// Show error message to user
				// this.showRemoveItemError(error.message);
			} finally {
				// Hide loading overlay
				this.hideRemoveItemLoader();
				// Reset removal flag
				this.isRemovingItem = false;
			}
		}

		hideCheckoutSections() {
			// Always hide these checkout-specific sections (they should only be visible when cart has items in checkout view)
			const stepProcessSection = this.modal.querySelector(
				".step-process-section"
			);
			if (stepProcessSection) {
				stepProcessSection.style.display = "none";
			}

			const countdownSection = this.modal.querySelector(".countdown-section");
			if (countdownSection) {
				countdownSection.style.display = "none";
			}

			const additionalRecommendationsSection = this.modal.querySelector(
				".additional-recommendations-section"
			);
			if (additionalRecommendationsSection) {
				additionalRecommendationsSection.style.display = "none";
			}

			// Handle footer based on current view and context
			const footer = this.modal.querySelector(".mini-atc-modal__footer");
			if (footer) {
				if (this.currentView === "checkout") {
					// In checkout view with empty cart, always hide the footer
					footer.style.display = "none";
				} else if (
					this.currentView === "personalize" &&
					this.openingContext === "add-multiple-products"
				) {
					// In personalize view with add-multiple-products, keep footer visible
					footer.style.display = "";
					footer.style.opacity = "1";
				}
			}
		}

		showCheckoutSections() {
			// Only show checkout-specific sections when in checkout view
			if (this.currentView === "checkout") {
				// Show step process section
				const stepProcessSection = this.modal.querySelector(
					".step-process-section"
				);
				if (stepProcessSection) {
					stepProcessSection.style.display = "";
					stepProcessSection.style.opacity = "1";
				}

				// Show countdown section
				const countdownSection = this.modal.querySelector(".countdown-section");
				if (countdownSection) {
					countdownSection.style.display = "";
					countdownSection.style.opacity = "1";
				}

				// Show additional recommendations section
				const additionalRecommendationsSection = this.modal.querySelector(
					".additional-recommendations-section"
				);
				if (additionalRecommendationsSection) {
					additionalRecommendationsSection.style.display = "";
					additionalRecommendationsSection.style.opacity = "1";
				}

				// Show footer (pricing and add to cart button) - context-aware
				const footer = this.modal.querySelector(".mini-atc-modal__footer");
				if (footer) {
					// Check if we should show the footer based on context and cart state
					const shouldShowFooter = this.shouldShowFooter(true); // Cart has items if we're showing sections
					if (shouldShowFooter) {
						footer.style.display = "";
						footer.style.opacity = "1";
					} else {
						footer.style.display = "none";
					}
				}
			}
			// In personalize view, always show footer for add-multiple-products context
			else if (this.currentView === "personalize") {
				const footer = this.modal.querySelector(".mini-atc-modal__footer");
				if (footer) {
					const shouldShowFooter = this.shouldShowFooter();
					if (shouldShowFooter) {
						footer.style.display = "";
						footer.style.opacity = "1";
					} else {
						footer.style.display = "none";
					}
				}
			}
		}

		shouldShowFooter(cartHasItems = null) {
			// If opened via add-multiple-products, always show footer (in personalize view)
			if (this.openingContext === "add-multiple-products") {
				return true; // Always show footer for add-multiple-products context
			}

			// If opened via cart icon, only show footer if cart has items (in checkout view)
			if (this.openingContext === "cart-icon") {
				// If cart state is provided, use it; otherwise try to determine from DOM
				if (cartHasItems !== null) {
					return cartHasItems;
				}

				// Try to determine from current cart state
				const checkoutContainer = this.modal.querySelector(
					".checkout-products-container"
				);
				if (checkoutContainer) {
					const cartItems = checkoutContainer.querySelectorAll(
						".checkout-products-wrap"
					);
					return cartItems.length > 0;
				}

				return false; // Default to hiding footer for cart-icon context
			}

			// Default behavior - show footer
			return true;
		}

		showEmptyCartMessage() {
			// Find or create empty cart message
			let emptyMessage = this.modal.querySelector(".empty-cart-message");

			if (!emptyMessage) {
				emptyMessage = document.createElement("div");
				emptyMessage.className = "empty-cart-message";
				emptyMessage.innerHTML = `
					<div class="empty-cart-message__content">
						<div class="empty-cart-message__icon">
							<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
								<circle cx="32" cy="32" r="32" fill="#f8f9fa"/>
								<path d="M20 24h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L42 24H20zm0 0L18 20H14" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<circle cx="29" cy="44" r="2" stroke="#6c757d" stroke-width="2"/>
								<circle cx="40" cy="44" r="2" stroke="#6c757d" stroke-width="2"/>
							</svg>
						</div>
						<h3 class="empty-cart-message__title">Cart is empty...</h3>
						<p class="empty-cart-message__description">Add some items to your cart to continue</p>
						<button type="button" class="empty-cart-message__continue-shopping" data-modal-close>
							Continue Shopping
						</button>
					</div>
				`;

				// Insert after the checkout summary heading
				const checkoutSummarySection = this.modal.querySelector(
					".checkout-summary-section"
				);
				if (checkoutSummarySection) {
					checkoutSummarySection.appendChild(emptyMessage);
				}
			}

			// Add CSS if not already present
			if (!document.querySelector("#empty-cart-message-styles")) {
				const style = document.createElement("style");
				style.id = "empty-cart-message-styles";
				style.textContent = `
					.empty-cart-message {
						text-align: center;
						padding: 40px 20px;
						margin: 20px 0;
					}
					
					.empty-cart-message__content {
						max-width: 310px;
						margin: 0 auto;
					}
					
					.empty-cart-message__icon {
						margin-bottom: 20px;
						display:flex;
						justify-content:center;
					}
					
					.empty-cart-message__title {
						font-family: Gabarito, sans-serif;
						font-size: 24px;
						font-weight: 600;
						color: #0D2026;
						margin: 0 0 12px 0;
					}
					
					.empty-cart-message__description {
						font-family: Gabarito, sans-serif;
						font-size: 16px;
						color: #6c757d;
						margin: 0 0 24px 0;
						line-height: 1.5;
					}
					
					.empty-cart-message__continue-shopping {
						background: #0D2026;
						color: white;
						border: none;
						border-radius: 8px;
						padding: 12px 24px;
						font-family: Gabarito, sans-serif;
						font-size: 16px;
						font-weight: 600;
						cursor: pointer;
						transition: all 0.2s ease;
						text-decoration: none;
						display: inline-block;
					}
					
					.empty-cart-message__continue-shopping:hover {
						background: #1a2f36;
						transform: translateY(-1px);
					}
					
					.empty-cart-message__continue-shopping:active {
						transform: translateY(0);
					}
				`;
				document.head.appendChild(style);
			}

			emptyMessage.style.display = "block";
		}

		hideEmptyCartMessage() {
			const emptyMessage = this.modal.querySelector(".empty-cart-message");
			if (emptyMessage) {
				emptyMessage.style.display = "none";
			}
		}

		showCartLoadingSpinner() {
			// Find the checkout view container
			const checkoutView = this.modal.querySelector('[data-view="checkout"]');

			if (!checkoutView) {
				console.warn("Checkout view not found for cart loading spinner");
				return;
			}

			// Hide all checkout content while loading
			const checkoutContainer = checkoutView.querySelector(
				".checkout-products-container"
			);
			const emptyState = checkoutView.querySelector(".checkout-empty-state");
			const stepProcess = this.modal.querySelector(".step-process-section");
			const countdown = this.modal.querySelector(".countdown-section");
			const recommendations = this.modal.querySelector(
				".additional-recommendations-section"
			);
			const footer = this.modal.querySelector(".mini-atc-modal__footer");

			// Store original display states and hide elements
			if (checkoutContainer) {
				checkoutContainer.dataset.originalDisplay =
					checkoutContainer.style.display || "";
				checkoutContainer.style.display = "none";
			}
			if (emptyState) {
				emptyState.dataset.originalDisplay = emptyState.style.display || "";
				emptyState.style.display = "none";
			}
			if (stepProcess) {
				stepProcess.dataset.originalDisplay = stepProcess.style.display || "";
				stepProcess.style.display = "none";
			}
			if (countdown) {
				countdown.dataset.originalDisplay = countdown.style.display || "";
				countdown.style.display = "none";
			}
			if (recommendations) {
				recommendations.dataset.originalDisplay =
					recommendations.style.display || "";
				recommendations.style.display = "none";
			}
			if (footer) {
				footer.dataset.originalDisplay = footer.style.display || "";
				footer.style.display = "none";
			}

			// Create or show loading overlay
			let loader = this.modal.querySelector(".cart-loading-spinner");
			if (!loader) {
				loader = document.createElement("div");
				loader.className = "cart-loading-spinner";
				loader.innerHTML = `
				<div class="cart-loading-spinner__overlay">
					<div class="cart-loading-spinner__content">
						<div class="cart-loading-spinner__spinner"></div>
						<div class="cart-loading-spinner__text">Loading cart...</div>
					</div>
				</div>
			`;
				checkoutView.appendChild(loader);
			}

			// Add loading styles if not already present
			if (!document.querySelector("#cart-loading-spinner-styles")) {
				const style = document.createElement("style");
				style.id = "cart-loading-spinner-styles";
				style.textContent = `
				.cart-loading-spinner {
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					z-index: 1001;
					pointer-events: all;
					min-height: 87vh;
				}
				
				.cart-loading-spinner__overlay {
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					display: flex;
					align-items: center;
					justify-content: center;
          backdrop-filter: blur(2px);
				}
				
				.cart-loading-spinner__content {
					text-align: center;
					color: #333;
				}
				
				.cart-loading-spinner__spinner {
					width: 40px;
					height: 40px;
					border: 4px solid #f3f3f3;
					border-top: 4px solid #0D2026;
					border-radius: 50%;
					animation: cartLoadingSpin 1s linear infinite;
					margin: 0 auto 16px;
					display: block !important;
				}
				
				.cart-loading-spinner__text {
					font-family: Gabarito, sans-serif;
					font-size: 16px;
					font-weight: 500;
					color: #0D2026;
				}
				
				@keyframes cartLoadingSpin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`;
				document.head.appendChild(style);
			}

			// Ensure checkout view has relative positioning
			const viewStyle = window.getComputedStyle(checkoutView);
			if (viewStyle.position === "static") {
				checkoutView.style.position = "relative";
			}

			loader.style.display = "block";
		}

		hideCartLoadingSpinner() {
			const loader = this.modal.querySelector(".cart-loading-spinner");
			if (loader) {
				loader.style.display = "none";
			}

			// Restore original display states of hidden elements
			const checkoutView = this.modal.querySelector('[data-view="checkout"]');
			if (checkoutView) {
				const checkoutContainer = checkoutView.querySelector(
					".checkout-products-container"
				);
				const emptyState = checkoutView.querySelector(".checkout-empty-state");
				const stepProcess = this.modal.querySelector(".step-process-section");
				const countdown = this.modal.querySelector(".countdown-section");
				const recommendations = this.modal.querySelector(
					".additional-recommendations-section"
				);
				const footer = this.modal.querySelector(".mini-atc-modal__footer");

				// Restore container and empty state
				if (
					checkoutContainer &&
					checkoutContainer.dataset.originalDisplay !== undefined
				) {
					checkoutContainer.style.display =
						checkoutContainer.dataset.originalDisplay;
					delete checkoutContainer.dataset.originalDisplay;
				}
				if (emptyState && emptyState.dataset.originalDisplay !== undefined) {
					emptyState.style.display = emptyState.dataset.originalDisplay;
					delete emptyState.dataset.originalDisplay;
				}

				// Don't restore checkout sections - let updateCheckoutView handle their visibility
				// Just clean up the stored data
				if (stepProcess && stepProcess.dataset.originalDisplay !== undefined) {
					delete stepProcess.dataset.originalDisplay;
				}
				if (countdown && countdown.dataset.originalDisplay !== undefined) {
					delete countdown.dataset.originalDisplay;
				}
				if (
					recommendations &&
					recommendations.dataset.originalDisplay !== undefined
				) {
					delete recommendations.dataset.originalDisplay;
				}

				// Restore footer only if it should be visible
				if (footer && footer.dataset.originalDisplay !== undefined) {
					const shouldShowFooter = this.shouldShowFooter();
					if (shouldShowFooter) {
						footer.style.display = footer.dataset.originalDisplay;
					}
					delete footer.dataset.originalDisplay;
				}
			}
		}

		showRemoveItemLoader() {
			// Find or create the checkout container
			const checkoutContainer =
				this.modal.querySelector("[data-checkout-items]") ||
				this.modal.querySelector(".checkout-products-container");

			if (!checkoutContainer) {
				console.warn("Checkout container not found for loader");
				return;
			}

			// Ensure checkout container has relative positioning
			const containerStyle = window.getComputedStyle(checkoutContainer);
			if (containerStyle.position === "static") {
				checkoutContainer.style.position = "relative";
			}

			// Create or show loading overlay
			let loader = this.modal.querySelector(".remove-item-loader");
			if (!loader) {
				loader = document.createElement("div");
				loader.className = "remove-item-loader";
				loader.innerHTML = `
					<div class="remove-item-loader__overlay">
						<div class="remove-item-loader__content">
							<div class="remove-item-loader__spinner"></div>
							<div class="remove-item-loader__text">Removing item...</div>
						</div>
					</div>
				`;
				checkoutContainer.appendChild(loader);
			}

			// Add loading styles if not already present
			if (!document.querySelector("#remove-item-loader-styles")) {
				const style = document.createElement("style");
				style.id = "remove-item-loader-styles";
				style.textContent = `
					.remove-item-loader {
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						z-index: 1000;
						pointer-events: all;
					}
					
					.remove-item-loader__overlay {
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						display: flex;
						align-items: center;
						justify-content: center;
						border-radius: 8px;
						backdrop-filter: blur(2px);
					}
					
					.remove-item-loader__content {
						text-align: center;
						color: #333;
					}
					
					.remove-item-loader__spinner {
						width: 32px;
						height: 32px;
						border: 3px solid #f3f3f3;
						border-top: 3px solid #0D2026;
						border-radius: 50%;
						animation: removeItemSpin 1s linear infinite;
						margin: 0 auto 12px;
            display: block !important;
					}
					
					.remove-item-loader__text {
						font-family: Gabarito, sans-serif;
						font-size: 14px;
						font-weight: 500;
						color: #0D2026;
					}
					
					@keyframes removeItemSpin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				`;
				document.head.appendChild(style);
			}

			loader.style.display = "block";
		}

		hideRemoveItemLoader() {
			const loader = this.modal.querySelector(".remove-item-loader");
			if (loader) {
				loader.style.display = "none";
			}
		}

		showRemoveItemError(errorMessage) {
			// Create or update error message
			let errorElement = this.modal.querySelector(".remove-item-error");

			if (!errorElement) {
				errorElement = document.createElement("div");
				errorElement.className = "remove-item-error";
				errorElement.setAttribute("role", "alert");
				errorElement.setAttribute("aria-live", "assertive");

				// Insert at the top of the checkout view
				const checkoutView = this.modal.querySelector('[data-view="checkout"]');
				if (checkoutView) {
					checkoutView.insertBefore(errorElement, checkoutView.firstChild);
				}
			}

			// Update error content
			errorElement.innerHTML = `
				<div class="remove-item-error__content">
					<svg class="remove-item-error__icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
						<circle cx="10" cy="10" r="10" fill="#dc3545"/>
						<path d="M10 6v4M10 14h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					<span class="remove-item-error__text">Failed to remove item: ${errorMessage}</span>
					<button type="button" class="remove-item-error__close" onclick="this.parentElement.parentElement.remove()">×</button>
				</div>
			`;

			// Add CSS if not already present
			if (!document.querySelector("#remove-item-error-styles")) {
				const style = document.createElement("style");
				style.id = "remove-item-error-styles";
				style.textContent = `
					.remove-item-error {
						background: #f8d7da;
						border: 1px solid #dc3545;
						border-radius: 8px;
						padding: 12px 16px;
						margin-bottom: 16px;
						animation: slideInError 0.3s ease-out;
					}
					
					.remove-item-error__content {
						display: flex;
						align-items: center;
						gap: 8px;
					}
					
					.remove-item-error__icon {
						flex-shrink: 0;
					}
					
					.remove-item-error__text {
						color: #721c24;
						font-family: Gabarito, sans-serif;
						font-size: 14px;
						font-weight: 500;
						flex: 1;
					}
					
					.remove-item-error__close {
						background: none;
						border: none;
						color: #721c24;
						font-size: 18px;
						font-weight: bold;
						cursor: pointer;
						padding: 0;
						width: 20px;
						height: 20px;
						display: flex;
						align-items: center;
						justify-content: center;
						border-radius: 50%;
						transition: background-color 0.2s;
					}
					
					.remove-item-error__close:hover {
						background-color: rgba(114, 28, 36, 0.1);
					}
					
					@keyframes slideInError {
						from {
							opacity: 0;
							transform: translateY(-10px);
						}
						to {
							opacity: 1;
							transform: translateY(0);
						}
					}
				`;
				document.head.appendChild(style);
			}

			// Auto-hide after 5 seconds
			setTimeout(() => {
				if (errorElement && errorElement.parentNode) {
					errorElement.style.opacity = "0";
					setTimeout(() => {
						if (errorElement && errorElement.parentNode) {
							errorElement.remove();
						}
					}, 300);
				}
			}, 5000);
		}

		proceedToCheckout() {
			// This method is called from checkout view
			// It should redirect to checkout page
			const state = this.state.getState();
			this.emit("checkoutInitiated", state);

			// Redirect to checkout
			window.location.href = window.routes?.checkout_url || "/checkout";
		}

		// Public API methods
		getState() {
			return this.state.getState();
		}

		setState(newState) {
			Object.keys(newState).forEach((key) => {
				this.state.updatePersonalization(key, newState[key]);
			});
		}

		reset() {
			this.state.reset();
			this.calculatePricing().catch(() => {});
			this.switchView("personalize");
		}

		destroy() {
			// Clean up components
			if (this.swiper) {
				this.swiper.destroy();
			}

			// if (this.countdown) {
			// 	this.countdown.destroy();
			// }

			// Remove event listeners
			document.removeEventListener("keydown", this.handleKeydown.bind(this));

			// Remove focus trap
			if (this.focusTrap) {
				this.focusTrap();
			}

			this.emit("modalDestroyed");
		}
	}

	// ============================================
	// GLOBAL INITIALIZATION
	// ============================================

	// Auto-initialize modals when DOM is ready
	function initializeModals() {
		// Prevent duplicate initialization
		if (window.MiniATCModal && window.MiniATCModal._initialized) {
			console.warn(
				"⚠️ Mini ATC Modal already initialized, skipping duplicate initialization"
			);
			return window.MiniATCModal.getAllInstances();
		}

		const modals = document.querySelectorAll(".mini-atc-modal");
		const instances = new Map();

		modals.forEach((modal, index) => {
			// Check if modal already has an instance
			if (modal._miniATCInstance) {
				console.warn(`⚠️ Modal ${modal.id} already has an instance, skipping`);
				instances.set(modal.id, modal._miniATCInstance);
				return;
			}

			const instance = new MiniATCModal(modal);
			instances.set(modal.id, instance);

			// Store reference on the modal element to prevent duplicate initialization
			modal._miniATCInstance = instance;

			// Make instance globally accessible
			const globalName = `miniATCModal_${modal.dataset.modalId || modal.id}`;
			window[globalName] = instance;
		});

		// Global API
		window.MiniATCModal = {
			_initialized: true,

			getInstance(modalId) {
				return instances.get(modalId);
			},

			getAllInstances() {
				return instances;
			},

			openModal(modalId) {
				const instance = instances.get(modalId);
				if (instance) {
					instance.open();
				}
			},

			closeModal(modalId) {
				const instance = instances.get(modalId);
				if (instance) {
					instance.close();
				}
			},
		};

		// Dispatch custom event when modal system is ready
		setTimeout(() => {
			document.dispatchEvent(new CustomEvent("miniATCModalReady"));
		}, 100);

		return instances;
	}

	// Initialize when DOM is ready - use a single approach
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initializeModals, {
			once: true,
		});
	} else {
		// DOM already loaded, initialize immediately
		initializeModals();
	}

	// Global functions for backward compatibility and external triggers
	window.openMiniATCModal = function (modalId, context = null) {
		if (window.MiniATCModal) {
			const instance = window.MiniATCModal.getInstance(modalId);
			if (instance) {
				instance.open(context);
			} else {
				window.MiniATCModal.openModal(modalId);
			}
		}
	};

	window.closeMiniATCModal = function (modalId) {
		if (window.MiniATCModal) {
			window.MiniATCModal.closeModal(modalId);
		}
	};

	// ============================================
	// DESIGN PREVIEW MODAL
	// ============================================

	class DesignPreviewModal {
		constructor(modal) {
			this.modal = modal;
			this.modalId = modal.id;
			this.swiper = null;
			this.isLoading = false;
			this.init();
		}

		init() {
			this.setupEventListeners();
			this.initSwiper();
		}

		setupEventListeners() {
			// Get only triggers that should open THIS specific modal
			const triggers = document.querySelectorAll(
				`[data-open-design-modal="${this.modalId}"]`
			);
			`[DesignPreviewModal] Found ${triggers.length} trigger(s) for modal: ${this.modalId}`;

			triggers.forEach((trigger) => {
				trigger.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					`[DesignPreviewModal] Trigger clicked for modal: ${this.modalId}`;
					this.open();
				});
			});

			// Close button
			const closeButtons = this.modal.querySelectorAll(
				"[data-design-modal-close]"
			);
			closeButtons.forEach((button) => {
				button.addEventListener("click", (e) => {
					e.stopPropagation();
					this.close();
				});
			});

			// Close when clicking outside the modal container
			const container = this.modal.querySelector(
				".design-preview-modal__container"
			);
			this.modal.addEventListener("click", (e) => {
				// Only close if clicking directly on the modal wrapper or overlay
				if (
					e.target === this.modal ||
					e.target.classList.contains("design-preview-modal__overlay")
				) {
					e.preventDefault();
					e.stopPropagation();
					this.close();
				}
			});

			// Prevent clicks inside container from closing the modal
			if (container) {
				container.addEventListener("click", (e) => {
					e.stopPropagation();
				});
			}

			// ESC key to close
			const handleEscape = (e) => {
				if (
					e.key === "Escape" &&
					this.modal.classList.contains("design-preview-modal--active")
				) {
					this.close();
				}
			};
			document.addEventListener("keydown", handleEscape);

			// Store the handler for cleanup if needed
			this.escapeHandler = handleEscape;
		}

		initSwiper() {
			const swiperContainer = this.modal.querySelector(
				".design-preview-swiper"
			);
			if (!swiperContainer || typeof Swiper === "undefined") {
				this.setupFallbackScroll();
				return;
			}

			// Initialize Swiper with freeMode for horizontal scrolling
			this.swiper = new Swiper(swiperContainer, {
				slidesPerView: "auto",
				spaceBetween: 30,
				freeMode: {
					enabled: true,
					sticky: false,
				},
				grabCursor: true,
				keyboard: {
					enabled: true,
					onlyInViewport: true,
				},
				mousewheel: {
					forceToAxis: true,
					sensitivity: 1,
				},
				a11y: {
					prevSlideMessage: "Previous design image",
					nextSlideMessage: "Next design image",
				},
			});
		}

		setupFallbackScroll() {
			// Fallback for browsers without Swiper
			const gallery = this.modal.querySelector(
				".design-preview-modal__gallery"
			);
			if (gallery) {
				gallery.style.overflowX = "auto";
				gallery.style.scrollBehavior = "smooth";
			}
		}

		open() {
			// Prevent opening if already active
			if (this.modal.classList.contains("design-preview-modal--active")) {
				`[DesignPreviewModal] Modal ${this.modalId} already open, ignoring open request`;
				return;
			}

			`[DesignPreviewModal] Opening modal: ${this.modalId}`;
			this.modal.classList.add("design-preview-modal--active");
			this.modal.setAttribute("aria-hidden", "false");
			document.body.style.overflow = "hidden";

			// NOTE: Dynamic image loading disabled in favor of static theme settings images
			// The images are now configured via Shopify Theme Settings > CHUUG Vessel Gallery
			// this.fetchAndDisplayImages();

			// Update swiper if it exists
			if (this.swiper) {
				setTimeout(() => {
					this.swiper.update();
				}, 100);
			}

			this.emit("opened");
		}

		async fetchAndDisplayImages() {
			if (this.isLoading) return;

			try {
				this.isLoading = true;
				`[DesignPreviewModal] Fetching product images...`;

				// Get vessel selections from POMC system
				if (!window.pomcSystem) {
					`[DesignPreviewModal] POMC system not found`;
					this.showNoImagesMessage();
					return;
				}

				const allVesselSelections = window.pomcSystem.getAllVesselSelections();

				// Extract product handles from vessel selections
				const productHandles = [];
				Object.values(allVesselSelections).forEach((selection) => {
					if (selection.productHandle) {
						productHandles.push(selection.productHandle);
					}
				});

				`[DesignPreviewModal] Found ${productHandles.length} product handle(s):`,
					productHandles;

				if (productHandles.length === 0) {
					this.showNoImagesMessage();
					return;
				}

				// Fetch product data for each product handle
				const productPromises = productHandles.map((productHandle) =>
					this.fetchProductDataByHandle(productHandle)
				);

				const products = await Promise.all(productPromises);
				const validProducts = products.filter((product) => product !== null);

				`[DesignPreviewModal] Fetched ${validProducts.length} valid product(s)`;

				// Update the swiper with product images
				this.updateSwiperImages(validProducts);
			} catch (error) {
				console.error(`[DesignPreviewModal] Error fetching images:`, error);
				this.showErrorMessage();
			} finally {
				this.isLoading = false;
			}
		}

		async fetchProductDataByHandle(productHandle) {
			try {
				const response = await fetch(`/products/${productHandle}.js`);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch product ${productHandle}: ${response.status}`
					);
				}
				const productData = await response.json();
				return productData;
			} catch (error) {
				console.error(
					`[DesignPreviewModal] Error fetching product ${productHandle}:`,
					error
				);
				return null;
			}
		}

		updateSwiperImages(products) {
			const swiperContainer = this.modal.querySelector(
				".design-preview-swiper"
			);
			const swiperWrapper = swiperContainer?.querySelector(".swiper-wrapper");

			if (!swiperWrapper) {
				console.error(`[DesignPreviewModal] Swiper wrapper not found`);
				return;
			}

			// Clear existing slides
			swiperWrapper.innerHTML = "";

			// Add slides for each product - only the featured (first) image
			products.forEach((product, index) => {
				if (product.images && product.images.length > 0) {
					// Get the featured image (first image)
					const featuredImage = product.images[0];
					const imageUrl = featuredImage.src || featuredImage;

					const newSlide = document.createElement("div");
					newSlide.className = "swiper-slide";

					newSlide.innerHTML = `
					<img 
						src="${imageUrl}" 
						alt="${product.title || `CHUUG Design Preview ${index + 1}`}" 
						width="467"
						height="467"
						loading="lazy"
					/>
				`;

					swiperWrapper.appendChild(newSlide);
				}
			});

			`[DesignPreviewModal] Added ${swiperWrapper.children.length} featured image slide(s)`;

			// Update swiper if it exists
			if (this.swiper) {
				setTimeout(() => {
					this.swiper.update();
				}, 100);
			}
		}

		showNoImagesMessage() {
			const swiperWrapper = this.modal.querySelector(".swiper-wrapper");
			if (swiperWrapper) {
				swiperWrapper.innerHTML = `
				<div class="swiper-slide">
					<div class="design-preview-loader">
						<p>No design images available</p>
					</div>
				</div>
			`;
			}
		}

		showErrorMessage() {
			const swiperWrapper = this.modal.querySelector(".swiper-wrapper");
			if (swiperWrapper) {
				swiperWrapper.innerHTML = `
				<div class="swiper-slide">
					<div class="design-preview-loader">
						<p>Error loading design images</p>
					</div>
				</div>
			`;
			}
		}

		close() {
			// Prevent closing if already inactive
			if (!this.modal.classList.contains("design-preview-modal--active")) {
				return;
			}

			`[DesignPreviewModal] Closing modal: ${this.modalId}`;
			this.modal.classList.remove("design-preview-modal--active");
			this.modal.setAttribute("aria-hidden", "true");
			document.body.style.overflow = "";

			this.emit("closed");
		}

		emit(eventName) {
			const event = new CustomEvent(`designPreviewModal:${eventName}`, {
				detail: { modal: this.modal },
			});
			this.modal.dispatchEvent(event);
		}
	}

	// Initialize Design Preview Modals
	function initializeDesignPreviewModals() {
		const designModals = document.querySelectorAll("[data-design-modal]");
		const instances = [];

		designModals.forEach((modal) => {
			const instance = new DesignPreviewModal(modal);
			instances.push(instance);

			// Log initialization for debugging
			`[DesignPreviewModal] Initialized modal: ${modal.id}`;
		});

		return instances;
	}

	// Initialize design modals when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener(
			"DOMContentLoaded",
			initializeDesignPreviewModals
		);
	} else {
		initializeDesignPreviewModals();
	}

	// Export for module systems
	if (typeof module !== "undefined" && module.exports) {
		module.exports = {
			MiniATCModal,
			PersonalizationState,
			PricingCalculator,
			DesignPreviewModal,
		};
	}
})();
