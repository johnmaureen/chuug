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

		formatPrice(cents) {
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
				this.state = { ...this.state, ...saved };
			}
		}

		saveState() {
			StorageManager.save(CONFIG.STORAGE_KEY, this.state);
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
			this.state.engraving.vessels[vesselId] = Utils.sanitizeInput(text);
			this.saveState();
			this.emit("vesselChanged", {
				vesselId,
				text: this.state.engraving.vessels[vesselId],
			});
		}

		getState() {
			return { ...this.state };
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
				// Fallback for manual dot navigation
				this.setupFallbackNavigation();
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
	// COUNTDOWN TIMER
	// ============================================

	class CountdownTimer {
		constructor(element, duration = 24 * 60 * 60) {
			// 24 hours default
			this.element = element;
			this.duration = duration;
			this.startTime = this.getStartTime();
			this.timer = null;
			this.init();
		}

		getStartTime() {
			const storageKey = "chuug_countdown_start";
			let startTime = StorageManager.load(storageKey);

			if (!startTime) {
				startTime = Math.floor(Date.now() / 1000);
				StorageManager.save(storageKey, startTime);
			}

			return startTime;
		}

		init() {
			this.update();
			this.timer = setInterval(() => this.update(), 1000);
		}

		update() {
			const currentTime = Math.floor(Date.now() / 1000);
			const elapsed = currentTime - this.startTime;
			const remaining = Math.max(0, this.duration - elapsed);

			if (remaining <= 0) {
				this.reset();
				return;
			}

			const hours = Math.floor(remaining / 3600);
			const minutes = Math.floor((remaining % 3600) / 60);
			const seconds = remaining % 60;

			const formattedTime =
				String(hours).padStart(2, "0") +
				":" +
				String(minutes).padStart(2, "0") +
				":" +
				String(seconds).padStart(2, "0");

			if (this.element) {
				this.element.textContent = formattedTime;
			}
		}

		reset() {
			this.startTime = Math.floor(Date.now() / 1000);
			StorageManager.save("chuug_countdown_start", this.startTime);
			if (this.element) {
				this.element.textContent = "24:00:00";
			}
		}

		destroy() {
			if (this.timer) {
				clearInterval(this.timer);
			}
		}
	}

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

		calculateTotal(state) {
			let total = 0;
			let originalTotal = 0;
			let vesselOnlyTotal = 0;
			let vesselOnlyOriginal = 0;

			// Get pricing from POMC system - this is the source of truth
			const vesselPricing = this.getVesselPricingForMultiplier();
			if (vesselPricing) {
				vesselOnlyTotal = vesselPricing.price;
				vesselOnlyOriginal = vesselPricing.originalPrice;
				total = vesselPricing.price;
				originalTotal = vesselPricing.originalPrice;
			} else {
				// If no POMC data available, return zero pricing
				console.warn("No vessel pricing data available from POMC system");
				return { total: 0, originalPrice: 0, savings: 0 };
			}

			// Handle gift box pricing - only add when enabled
			// The gift box price is loaded dynamically from product data
			const giftBoxPrice = this.dynamicPrices.giftBox;

			if (state.giftBox?.enabled && giftBoxPrice) {
				// Gift box is enabled - add to both totals for consistent comparison
				total += giftBoxPrice;
				originalTotal += giftBoxPrice;
			}
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
					const engravingEnabled = this.getEngravingState();
					const variantIndex = engravingEnabled ? 1 : 0;

					const variant = selectedProductAmountData.variants[variantIndex];
					if (variant) {
						// Store the pricing for reference
						this.dynamicPrices.vessel = {
							price: variant.price,
							originalPrice: variant.compare_at_price,
						};
						
						return {
							price: variant.price,
							originalPrice: variant.compare_at_price,
						};
					}
				}
			}

			// No pricing data available
			return null;
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
				} catch (error) {
					console.warn("Failed to parse modal config:", error);
				}
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
					const itemId = removeBtn.getAttribute("data-remove-item");
					console.log(`🖱️ CLICK: Delete button clicked for item ${itemId}`);
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

			// Initialize countdown timer
			const countdownElement = this.modal.querySelector(
				".countdown-timer__time"
			);
			if (countdownElement) {
				this.countdown = new CountdownTimer(countdownElement);
			}

			// Initialize vessel inputs based on toggle states
			this.initializeVesselInputs();

			// Initial pricing calculation
			this.calculatePricing();
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

			console.log("🔄 Toggle changed:", {
				element: toggle,
				checked: toggle.checked,
				hasPersonalizationToggle: toggle.hasAttribute("data-personalization-toggle"),
				hasAddonToggle: toggle.hasAttribute("data-addon-toggle"),
				hasVesselToggle: toggle.hasAttribute("data-vessel-toggle"),
				hasGiftBoxVariantId: toggle.hasAttribute("data-gift-box-variant-id")
			});

			if (toggle.hasAttribute("data-personalization-toggle")) {
				const type = toggle.getAttribute("data-personalization-toggle");
				console.log("🔄 Updating personalization:", type, "enabled:", toggle.checked);
				this.state.updatePersonalization(type, { enabled: toggle.checked });
			} else if (toggle.hasAttribute("data-addon-toggle")) {
				const type = toggle.getAttribute("data-addon-toggle");
				console.log("🔄 Addon toggle:", type, "enabled:", toggle.checked);
				// Handle gift box toggle specifically with correct key
				if (type === "gift-box") {
					console.log("🎁 Gift box toggle changed to:", toggle.checked);
					this.state.updatePersonalization("giftBox", {
						enabled: toggle.checked,
					});
					console.log("🎁 Gift box state after update:", this.state.state.giftBox);
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
			}

			this.toggleOptionsVisibility(toggle);

			// Recalculate pricing when any toggle changes
			this.calculatePricing();
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
				default:
			}
		}

		handlePersonalizationChange(data) {
			this.calculatePricing();
			this.emit("personalizationChanged", data);
		}

		handleVariantChange(data) {
			this.calculatePricing();
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

			// Remove existing vessel rows
			const existingRows = vesselContainer.querySelectorAll(
				".vessel-personalization-row"
			);
			existingRows.forEach((row) => row.remove());

			// Create new vessel rows based on vessel count
			for (let i = 1; i <= vesselCount; i++) {
				const vesselRow = this.createVesselPersonalizationRow(i);
				vesselContainer.appendChild(vesselRow);
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
            placeholder="Maximum of 3 Letters"
            maxlength="3"
            pattern="[A-Za-z]{0,3}"
            title="Only letters are allowed (maximum 3)"
            data-vessel-input="${vesselNumber}"
            data-property="properties[Vessel ${vesselNumber} Engraving]"
            aria-describedby="${modalId}-vessel-${vesselNumber}-description"
          >
        </div>
        
        <div id="${modalId}-vessel-${vesselNumber}-description" class="visually-hidden">
          Enter up to 3 letters for vessel ${vesselNumber} engraving
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

			// Update swiper if it exists
			if (this.swiper && this.swiper.swiper) {
				this.swiper.swiper.update();
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

		calculatePricing() {
			const state = this.state.getState();
			this.pricing.calculateTotal(state);
		}

		setupPOMCIntegration() {
			// Listen for POMC system changes and update pricing
			if (window.pomcSystem) {
				// Create a custom event listener for POMC changes
				const updatePricingFromPOMC = (event) => {
					this.calculatePricing();
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
				document.addEventListener(
					"pomcProductAmountChanged",
					updatePricingFromPOMC
				);

				// Also listen for the modal opening to ensure pricing is current
				this.modal.addEventListener("modalOpened", () => {
					setTimeout(updatePricingFromPOMC, 100); // Small delay to ensure POMC is ready
				});

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
				this.handleEngravingToggleChange = (event) => {
					this.calculatePricing();
				};

				engravingToggle.addEventListener(
					"change",
					this.handleEngravingToggleChange
				);
			}
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
			const engravingEnabled =
				state.engraving?.enabled || false;

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

		updatePricingDisplay(pricing) {
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
		}

		switchView(viewName) {
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
						btnTextEl.textContent = "CHECK OUT";
						addToCartBtn.setAttribute(
							"data-modal-action",
							"proceed-to-checkout"
						);
						break;
					case "personalize":
					default:
						btnTextEl.textContent = "ADD TO CART";
						addToCartBtn.setAttribute("data-modal-action", "add-to-cart");
						break;
				}
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
				// Ensure footer is visible for add-multiple-products context
				const footer = this.modal.querySelector(".mini-atc-modal__footer");
				if (footer) {
					footer.style.display = "";
					footer.style.opacity = "1";
				}
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

			// Fetch vessel selections data and update product images
			this.fetchVesselSelectionsAndUpdateImages();

			// Calculate initial pricing
			this.calculatePricing();

			// Setup engraving toggle listener now that modal is visible
			this.setupEngravingToggleListener();

			// Force pricing refresh to ensure it's up to date with any changes made while modal was closed
			setTimeout(() => {
				this.calculatePricing();
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
			try {
				// Show loading state
				this.setLoadingState(true);

				// Collect all data for cart
				const cartData = this.collectCartData();

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

				// Update cart UI if cart drawer exists
				if (window.cart && typeof window.cart.renderContents === "function") {
					window.cart.renderContents(response);
				}

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
				const checkoutContainer = this.modal.querySelector("[data-checkout-items]");
				if (checkoutContainer) {
					checkoutContainer.style.display = "";
				}

				// Show success feedback
				this.showAddToCartSuccess(cartData.items.length);

				// Reset personalization toggles and gift box toggle after successful add to cart
				this.resetPersonalizationToggles();
				this.resetGiftBoxToggle();
				
				// Update pricing after reset
				this.calculatePricing();

				// Optional: redirect to cart page after delay
				// setTimeout(() => {
				//   window.location.href = window.routes.cart_url || '/cart';
				// }, 2000);
			} catch (error) {
				console.error("Add to cart error:", error);
				this.handleAddToCartError(error.message);
				// Hide cart loading spinner on error
				this.hideCartLoadingSpinner();
			} finally {
				this.setLoadingState(false);
			}
		}

		collectCartData() {
			const state = this.state.getState();

			const items = [];

			// Collect vessel products and their associated add-ons in interleaved order
			const vesselItems = this.collectVesselProducts(state);
			const addonItems = this.collectAddonProducts(state);

			// Group add-ons by vessel number for easier lookup
			const addonsByVessel = {};
			addonItems.forEach(addon => {
				const vesselNumber = addon.properties['Vessel Number'];
				if (vesselNumber) {
					if (!addonsByVessel[vesselNumber]) {
						addonsByVessel[vesselNumber] = [];
					}
					addonsByVessel[vesselNumber].push(addon);
				}
			});

			// Interleave vessels with their add-ons
			vesselItems.forEach(vessel => {
				// Add the vessel first
				items.push(vessel);

				// Find vessel number from properties
				let vesselNumber = null;
				for (const [key, value] of Object.entries(vessel.properties)) {
					if (key.includes('Vessel') && key.includes('Product')) {
						const parts = key.split(' ');
						if (parts.length >= 2) {
							vesselNumber = parts[1];
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
			addonItems.forEach(addon => {
				if (!addon.properties['Vessel Number']) {
					items.push(addon);
				}
			});

			const cartData = {
				items,
				note: this.collectOrderNote(state),
				attributes: this.collectOrderAttributes(state),
			};

			return cartData;
		}

		collectVesselProducts(state) {
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

			// Process each vessel
			Object.entries(vesselSelections).forEach(
				([vesselIndex, selection], index) => {

					// Check for variant ID - POMC system uses woodVariantId/ropeVariantId
					let variantId =
						selection.variantId ||
						selection.woodVariantId ||
						selection.ropeVariantId;

					if (!variantId) {
						return;
					}

					const vesselNumber = parseInt(vesselIndex);
					const vesselEngraving =
						state.engraving?.vessels?.[vesselNumber] || "";


					// For POMC system, we might need to determine variant based on engraving differently
					// Check if there's an engraving variant available
					if (engravingEnabled && selection.engravingVariantId) {
						variantId = selection.engravingVariantId;
					}

					// Create properties object
					const properties = {};

					// Add vessel engraving if provided
					if (
						engravingEnabled &&
						vesselEngraving &&
						vesselEngraving.trim() !== ""
					) {
						properties[`Vessel ${vesselNumber} Engraving`] = vesselEngraving
							.trim()
							.toUpperCase();
					}

					// Add vessel selection details
					if (selection.productHandle) {
						properties[`Vessel ${vesselNumber} Product`] =
							selection.productHandle;
					}
					if (selection.woodType) {
						properties[`Vessel ${vesselNumber} Wood Type`] = selection.woodType;
					}
					if (selection.ropeType) {
						properties[`Vessel ${vesselNumber} Rope Type`] = selection.ropeType;
					}

					const item = {
						id: variantId,
						quantity: 1,
						properties,
					};

					items.push(item);
				}
			);

			// Fallback: If no vessel items were collected, try to get from selectedProductAmountData
			if (items.length === 0 && selectedProductAmountData) {

				// Use the selected product amount data as fallback
				const fallbackVariantIndex = engravingEnabled ? 1 : 0;
				const fallbackVariant =
					selectedProductAmountData.variants?.[fallbackVariantIndex];

				if (fallbackVariant?.id) {
					const fallbackItem = {
						id: fallbackVariant.id,
						quantity: multiplier || 1,
						properties: {
							"Product Source": "Selected Product Amount Data",
							...(engravingEnabled && { Engraving: "Enabled" }),
						},
					};

					items.push(fallbackItem);
				}
			}

			return items;
		}

		collectAddonProducts(state) {
			const items = [];

			// 1. Gift Box - Add one per vessel
			if (state.giftBox?.enabled) {
				console.log("🎁 Gift box is enabled in state:", state.giftBox);
				
				// Get vessel count from POMC system
				const vesselCount = window.pomcSystem ? window.pomcSystem.getMultiplier() || 1 : 1;
				console.log("🎁 Vessel count for gift boxes:", vesselCount);
				
				// Get gift box variant ID from modal config or default
				const giftBoxVariantId = this.getGiftBoxVariantId();
				console.log("🎁 Gift box variant ID:", giftBoxVariantId);
				
				if (giftBoxVariantId) {
					// Add one gift box per vessel
					for (let i = 0; i < vesselCount; i++) {
						const giftBoxItem = {
							id: giftBoxVariantId,
							quantity: 1,
							properties: {
								"Add-on": "Premium Gift Box",
								"Product Handle": "premium-gift-box-tissue-wrap",
								"Vessel Number": i + 1,
							},
						};
						console.log(`🎁 Gift box item ${i + 1} being added:`, giftBoxItem);
						items.push(giftBoxItem);
					}
				} else {
					console.log("❌ No gift box variant ID found!");
				}
			} else {
				console.log("❌ Gift box is NOT enabled in state:", state.giftBox);
			}

			// 2. Mix & Match variants
			if (state.mixMatch?.enabled && state.mixMatch.variants) {
				Object.entries(state.mixMatch.variants).forEach(
					([variantId, quantity]) => {
						if (quantity > 0) {
							const mixMatchItem = {
								id: variantId,
								quantity: quantity,
								properties: {
									"Add-on": "Mix & Match",
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
									"Add-on": "Extra Cups",
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
					([vesselId, text]) => {
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
			console.log("🔍 Getting gift box variant ID...");
			
			// Try to get from modal config first
			const config = this.config;
			console.log("🔍 Modal config:", config);
			if (config.giftBox?.variantId) {
				console.log("✅ Found variant ID in config:", config.giftBox.variantId);
				return config.giftBox.variantId;
			}

			// Try to get from DOM
			const giftBoxToggle = this.modal.querySelector(
				"[data-gift-box-variant-id]"
			);
			console.log("🔍 Gift box toggle element:", giftBoxToggle);
			if (giftBoxToggle) {
				const variantId = giftBoxToggle.getAttribute("data-gift-box-variant-id");
				console.log("✅ Found variant ID in DOM:", variantId);
				return variantId;
			}

			// Fallback - you may need to set this based on your actual gift box product
			console.log("❌ No gift box variant ID found in config or DOM");
			return null;
		}

		async addItemsToShopifyCart(cartData) {
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
				}),
			};

			const response = await fetch("/cart/add.js", config);
			return await response.json();
		}

		setLoadingState(loading) {
			const addToCartBtn = this.modal.querySelector(
				".mini-atc-modal__add-to-cart-btn"
			);
			const btnText = addToCartBtn?.querySelector(".mini-atc-modal__btn-text");

			if (loading) {
				addToCartBtn?.classList.add("loading");
				addToCartBtn?.setAttribute("disabled", "true");
				if (btnText) btnText.textContent = "ADDING TO CART...";
			} else {
				addToCartBtn?.classList.remove("loading");
				addToCartBtn?.removeAttribute("disabled");
				if (btnText) btnText.textContent = "ADD TO CART";
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
					<span class="success-text">✅ Successfully added ${itemCount} ${itemText} to cart!</span>
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
			}, 5000);
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
					const allExistingItems = checkoutContainer.querySelectorAll(".checkout-product-item-wrap, .checkout-products-wrap, .premium-gift-box, [data-item-id]");
					console.log(`🧹 Empty cart: Clearing ${allExistingItems.length} existing items to show clean empty state`);
					allExistingItems.forEach((item) => item.remove());
					
					// Show empty state
					if (emptyState) {
						emptyState.style.display = "block";
					}

					// Hide checkout sections when cart is empty
					this.hideCheckoutSections();

					// Show empty cart message
					this.showEmptyCartMessage();
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
					const allExistingItems = checkoutContainer.querySelectorAll(".checkout-product-item-wrap, .checkout-products-wrap, .premium-gift-box, [data-item-id]");
					allExistingItems.forEach((item) => item.remove());

					// Render new cart items
					await this.renderCartItems(cartData.items, checkoutContainer);

					// Re-bind event handlers for the newly rendered items
					this.bindCheckoutItemEvents();
				}

			} catch (error) {
				console.error("Failed to update checkout view with cart data:", error);
			}
		}

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
				console.log("🛒 renderCartItems called with:", cartItems.length, "items");
				console.log("🛒 Container element:", container);
				
				// Create a temporary container to hold the rendered items
				const tempContainer = document.createElement('div');
				
				// Render each cart item in reverse order (newest first, like Liquid template)
				for (let i = cartItems.length - 1; i >= 0; i--) {
					const item = cartItems[i];
					console.log("🛒 Rendering item:", item.id, item.product_title);
					const itemElement = await this.renderCartItem(item, cartItems);
					if (itemElement) {
						console.log("🛒 Item element created:", itemElement);
						tempContainer.appendChild(itemElement);
					} else {
						console.warn("🛒 Item element was null for:", item.id);
					}
				}
				
				console.log("🛒 Temp container children:", tempContainer.children.length);
				
				// Append all items to the main container
				while (tempContainer.firstChild) {
					container.appendChild(tempContainer.firstChild);
				}
				
				console.log("🛒 Final container children:", container.children.length);
				console.log("🛒 Container HTML:", container.innerHTML);
				console.log("🛒 Container classes:", container.className);
				console.log("🛒 Container style:", container.style.cssText);
				
			} catch (error) {
				console.error("Failed to render cart items:", error);
			}
		}

		async renderCartItem(item, allCartItems) {
			try {
				console.log("🛒 renderCartItem called for:", item.id, item.product_title);
				
				// Check if this is an add-on item that should be grouped with a vessel
				const isAddon = item.properties && Object.entries(item.properties).some(([key, value]) => key === 'Add-on');
				console.log("🛒 Is addon:", isAddon);
				
				// Only render main vessel items, not add-ons (they'll be rendered within vessel items)
				if (isAddon) {
					console.log("🛒 Skipping addon item:", item.id);
					return null;
				}
				
				// Create the main wrapper element
				const wrapper = document.createElement('div');
				wrapper.className = 'checkout-product-item-wrap';
				
				// Create the checkout products wrap element
				const itemElement = document.createElement('div');
				itemElement.className = 'checkout-products-wrap';
				itemElement.setAttribute('data-item-id', item.id);
				
				// Create the container
				const container = document.createElement('div');
				container.className = 'checkout-products-wrap__container';
				
				// Create image section
				const imageSection = document.createElement('div');
				imageSection.className = 'checkout-products-wrap__image';
				
				const imageContainer = document.createElement('div');
				imageContainer.className = 'checkout-products-wrap__image-container';
				
				if (item.image) {
					const img = document.createElement('img');
					img.src = item.image;
					img.alt = item.product_title || '';
					img.width = 128;
					img.height = 128;
					img.loading = 'lazy';
					img.className = 'checkout-products-wrap__product-image';
					imageContainer.appendChild(img);
				} else {
					const placeholder = document.createElement('div');
					placeholder.className = 'checkout-products-wrap__placeholder';
					placeholder.innerHTML = '<svg class="placeholder-svg" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg"><rect width="525" height="525" fill="#f6f6f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle" dy=".3em">No image</text></svg>';
					imageContainer.appendChild(placeholder);
				}
				
				imageSection.appendChild(imageContainer);
				
				// Create details section
				const detailsSection = document.createElement('div');
				detailsSection.className = 'checkout-products-wrap__details';
				
				// Create header with title and delete button
				const header = document.createElement('div');
				header.className = 'checkout-products-wrap__header';
				
				const title = document.createElement('h3');
				title.className = 'checkout-products-wrap__title';
				title.textContent = item.product_title || '';
				
				const deleteBtn = document.createElement('button');
				deleteBtn.type = 'button';
				deleteBtn.className = 'checkout-products-wrap__delete';
				deleteBtn.setAttribute('data-remove-item', item.id);
				deleteBtn.setAttribute('aria-label', `Remove ${item.product_title || ''} from cart`);
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
				const optionsSection = document.createElement('div');
				optionsSection.className = 'checkout-products-wrap__options';
				
				// Add options based on item properties (matching Liquid logic)
				if (item.properties && (item.product_title.includes('CHUUG') || item.product_title.includes('Chuug'))) {
					let engravingText = '';
					let hasInsulatedCup = false;
					
					Object.entries(item.properties).forEach(([key, value]) => {
						if (key.includes('Engraving')) {
							engravingText = value;
						}
						const keyLower = key.toLowerCase();
						if (keyLower.includes('insulated') || keyLower.includes('cup') || keyLower.includes('silver cup')) {
							hasInsulatedCup = true;
						}
					});
					
					if (engravingText) {
						const optionChip = document.createElement('div');
						optionChip.className = 'checkout-products-wrap__option-chip';
						optionChip.textContent = `🔨 Engraved Initials, ${engravingText}`;
						optionsSection.appendChild(optionChip);
					}
					
					if (hasInsulatedCup) {
						const optionChip = document.createElement('div');
						optionChip.className = 'checkout-products-wrap__option-chip';
						optionChip.textContent = '🍺 Silver Insulated Cup';
						optionsSection.appendChild(optionChip);
					}
				}
				
				// Add-on Products Section (matching Liquid logic)
				const currentVesselNumber = this.extractVesselNumber(item);
				
				// Find add-on for this vessel
				if (currentVesselNumber) {
					const currentItemIndex = allCartItems.findIndex(cartItem => cartItem.id === item.id);
					if (currentItemIndex !== -1 && currentItemIndex < allCartItems.length - 1) {
						const nextItem = allCartItems[currentItemIndex + 1];
						if (nextItem && nextItem.properties) {
							const isAddonForVessel = Object.entries(nextItem.properties).some(([key, value]) => 
								key === 'Add-on' && value === 'Premium Gift Box'
							) && Object.entries(nextItem.properties).some(([key, value]) => 
								key === 'Vessel Number' && value === currentVesselNumber
							);
							
							if (isAddonForVessel) {
								const addonSection = document.createElement('div');
								addonSection.className = 'checkout-products-wrap__addon';
								
								const addonItem = document.createElement('div');
								addonItem.className = 'checkout-products-wrap__addon-item';
								
								const addonIcon = document.createElement('div');
								addonIcon.className = 'checkout-products-wrap__addon-icon';
								addonIcon.textContent = '🎁';
								
								const addonDetails = document.createElement('div');
								addonDetails.className = 'checkout-products-wrap__addon-details';
								
								const addonTitle = document.createElement('span');
								addonTitle.className = 'checkout-products-wrap__addon-title';
								addonTitle.textContent = 'Premium Gift Box';
								
								const addonPrice = document.createElement('span');
								addonPrice.className = 'checkout-products-wrap__addon-price';
								addonPrice.textContent = this.formatMoney(nextItem.final_price || nextItem.price);
								
								addonDetails.appendChild(addonTitle);
								addonDetails.appendChild(addonPrice);
								
								const addonRemove = document.createElement('button');
								addonRemove.type = 'button';
								addonRemove.className = 'checkout-products-wrap__addon-remove';
								addonRemove.setAttribute('data-remove-item', nextItem.id);
								addonRemove.setAttribute('aria-label', 'Remove Premium Gift Box from cart');
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
				const pricingSection = document.createElement('div');
				pricingSection.className = 'checkout-products-wrap__pricing';
				
				const currentPrice = document.createElement('span');
				currentPrice.className = 'checkout-products-wrap__current-price';
				currentPrice.textContent = this.formatMoney(item.final_price || item.price);
				
				pricingSection.appendChild(currentPrice);
				
				// If there's a discount, show original price
				if (item.original_price && item.original_price !== item.final_price) {
					const originalPrice = document.createElement('span');
					originalPrice.className = 'checkout-products-wrap__original-price';
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
				
				// Premium Gift Box section (matching Liquid logic)
				// Look for gift box add-ons that belong to this specific vessel
				const vesselNumber = this.extractVesselNumber(item);
				console.log(`🎁 DEBUG: Item ${item.id} (${item.product_title}) has vessel number:`, vesselNumber);
				
				if (vesselNumber) {
					// Debug: Log all gift box items
					const allGiftBoxes = allCartItems.filter(giftItem => 
						giftItem.properties && giftItem.properties['Add-on'] === 'Premium Gift Box'
					);
					console.log(`🎁 DEBUG: Found ${allGiftBoxes.length} gift box items:`, allGiftBoxes.map(gb => ({
						id: gb.id,
						title: gb.product_title,
						vesselNumber: gb.properties['Vessel Number']
					})));
					
					const giftBoxForThisVessel = allCartItems.find(giftItem => 
						giftItem.properties && 
						giftItem.properties['Add-on'] === 'Premium Gift Box' &&
						String(giftItem.properties['Vessel Number']) === String(vesselNumber)
					);
					
					console.log(`🎁 DEBUG: Gift box for vessel ${vesselNumber}:`, giftBoxForThisVessel ? {
						id: giftBoxForThisVessel.id,
						title: giftBoxForThisVessel.product_title
					} : 'NOT FOUND');
					
					if (giftBoxForThisVessel) {
						const giftBoxSection = document.createElement('div');
						giftBoxSection.className = 'premium-gift-box';
						
						const giftBoxContainer = document.createElement('div');
						giftBoxContainer.className = 'premium-gift-box__container';
						
						// Product Image
						const giftBoxImage = document.createElement('div');
						giftBoxImage.className = 'premium-gift-box__image';
						
						if (giftBoxForThisVessel.image) {
							const img = document.createElement('img');
							img.src = giftBoxForThisVessel.image;
							img.alt = giftBoxForThisVessel.product_title || 'Premium Gift Box & Wrap';
							img.width = 71;
							img.height = 89;
							giftBoxImage.appendChild(img);
						} else {
							const img = document.createElement('img');
							img.src = '/assets/premium-gift-box.png'; // Fallback image
							img.alt = 'Premium Gift Box & Wrap';
							img.width = 71;
							img.height = 89;
							giftBoxImage.appendChild(img);
						}
						
						// Content Area
						const giftBoxContent = document.createElement('div');
						giftBoxContent.className = 'premium-gift-box__content';
						
						const giftBoxDetails = document.createElement('div');
						giftBoxDetails.className = 'premium-gift-box__details';
						
						const giftBoxText = document.createElement('div');
						giftBoxText.className = 'premium-gift-box__text';
						
						const giftBoxTitle = document.createElement('h4');
						giftBoxTitle.className = 'premium-gift-box__title';
						giftBoxTitle.textContent = giftBoxForThisVessel.product_title;
						
						const giftBoxPrice = document.createElement('div');
						giftBoxPrice.className = 'premium-gift-box__price';
						giftBoxPrice.textContent = this.formatMoney(giftBoxForThisVessel.final_price || giftBoxForThisVessel.price);
						
						giftBoxText.appendChild(giftBoxTitle);
						giftBoxDetails.appendChild(giftBoxText);
						giftBoxDetails.appendChild(giftBoxPrice);
						
						// Toggle Section
						const giftBoxDelete = document.createElement('button');
						giftBoxDelete.type = 'button';
						giftBoxDelete.className = 'checkout-products-wrap__delete';
						giftBoxDelete.setAttribute('data-remove-item', giftBoxForThisVessel.id);
						giftBoxDelete.setAttribute('aria-label', 'Remove Premium Gift Box from cart');
						giftBoxDelete.innerHTML = `
							<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M3 6H5H21" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M10 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M14 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						`;
						
						giftBoxContent.appendChild(giftBoxDetails);
						giftBoxContent.appendChild(giftBoxDelete);
						
						giftBoxContainer.appendChild(giftBoxImage);
						giftBoxContainer.appendChild(giftBoxContent);
						giftBoxSection.appendChild(giftBoxContainer);
						
						// Add gift box section to wrapper
						wrapper.appendChild(giftBoxSection);
					}
				}
				
				return wrapper;
				
			} catch (error) {
				console.error("Failed to render cart item:", error);
				return null;
			}
		}

		formatMoney(cents) {
			// Simple money formatting - you may want to use Shopify's money formatting
			const amount = (cents / 100).toFixed(2);
			return `£${amount}`;
		}

		resetPersonalizationToggles() {
			// Reset engraving toggle to true (default state)
			const engravingToggle = this.modal.querySelector('[data-personalization-toggle="engraving"]');
			if (engravingToggle) {
				engravingToggle.checked = true;
			}
			
			// Reset all other personalization toggles to false
			const otherToggles = this.modal.querySelectorAll('[data-personalization-toggle]:not([data-personalization-toggle="engraving"])');
			otherToggles.forEach(toggle => {
				toggle.checked = false;
			});
		}

		resetGiftBoxToggle() {
			// Reset gift box toggle to false (default state)
			const giftBoxToggle = this.modal.querySelector('.mini-atc-modal--gift-box-toggle');
			if (giftBoxToggle) {
				giftBoxToggle.checked = false;
			}
			
			// Also reset any gift box toggle slider
			const giftBoxToggleSlider = this.modal.querySelector('.premium-gift-box__toggle-slider');
			if (giftBoxToggleSlider) {
				// Find the associated checkbox input
				const checkbox = giftBoxToggleSlider.closest('.premium-gift-box').querySelector('input[type="checkbox"]');
				if (checkbox) {
					checkbox.checked = false;
				}
			}
		}

		extractVesselNumber(item) {
			// Extract vessel number from item properties
			// Look for properties like "Vessel 1 Product", "Vessel 2 Product", etc.
			console.log(`🔍 DEBUG: Extracting vessel number for item ${item.id}:`, item.properties);
			
			if (item.properties) {
				for (const [key, value] of Object.entries(item.properties)) {
					console.log(`🔍 DEBUG: Checking property: ${key} = ${value}`);
					if (key.includes('Vessel') && key.includes('Product')) {
						const parts = key.split(' ');
						console.log(`🔍 DEBUG: Found vessel property, parts:`, parts);
						if (parts.length >= 2) {
							const vesselNum = parts[1];
							console.log(`🔍 DEBUG: Extracted vessel number: ${vesselNum}`);
							return vesselNum; // Return the vessel number
						}
					}
				}
			}
			console.log(`🔍 DEBUG: No vessel number found for item ${item.id}`);
			return null;
		}

		async findAssociatedGiftBoxesFromCartData(vesselItemId, cartData) {
			try {
				console.log(`🔍 DEBUG: Starting cleanup for vessel item ${vesselItemId}`);
				
				if (!cartData || !cartData.items) {
					console.log(`🔍 DEBUG: No cart data or items found`);
					return [];
				}

				console.log(`🔍 DEBUG: Cart has ${cartData.items.length} items`);
				console.log(`🔍 DEBUG: All cart items:`, cartData.items.map(item => ({
					id: item.id,
					title: item.product_title,
					properties: item.properties
				})));

				// Find the vessel item to get its vessel number
				const vesselItem = cartData.items.find(item => item.id.toString() === vesselItemId.toString());
				if (!vesselItem) {
					console.log(`🔍 DEBUG: Vessel item ${vesselItemId} not found in cart`);
					console.log(`🔍 DEBUG: Available item IDs:`, cartData.items.map(item => item.id));
					return [];
				}

				console.log(`🔍 DEBUG: Found vessel item:`, {
					id: vesselItem.id,
					title: vesselItem.product_title,
					properties: vesselItem.properties
				});

				// Extract vessel number from the vessel item's properties
				let vesselNumber = null;
				console.log(`🔍 DEBUG: Vessel item properties:`, vesselItem.properties);
				
				// Properties are stored as an object, not an array
				for (const [key, value] of Object.entries(vesselItem.properties || {})) {
					console.log(`🔍 DEBUG: Checking property key: ${key}, value: ${value}`);
					// Look for properties like "Vessel 2 Product", "Vessel 1 Product", etc.
					if (key.includes('Vessel') && key.includes('Product')) {
						// Extract number from property name like "Vessel 2 Product"
						const vesselPropertyParts = key.split(' ');
						if (vesselPropertyParts.length >= 2) {
							vesselNumber = vesselPropertyParts[1];
							console.log(`🔍 DEBUG: Found vessel number: ${vesselNumber}`);
							break;
						}
					}
				}

				if (!vesselNumber) {
					console.log(`🔍 DEBUG: No vessel number found for item ${vesselItemId}`);
					console.log(`🔍 DEBUG: Available properties:`, vesselItem.properties);
					return [];
				}

				console.log(`🔍 DEBUG: Looking for gift boxes associated with vessel number ${vesselNumber}`);

				// Find gift boxes with matching vessel number
				const associatedGiftBoxIds = [];
				for (const item of cartData.items) {
					if (item.id.toString() === vesselItemId.toString()) {
						continue; // Skip the vessel item itself
					}

					console.log(`🔍 DEBUG: Checking item ${item.id}:`, {
						title: item.product_title,
						properties: item.properties
					});

					// Check if this item is a gift box
					let isGiftBox = false;
					let hasMatchingVesselNumber = false;

					// Properties are stored as an object, not an array
					for (const [key, value] of Object.entries(item.properties || {})) {
						console.log(`🔍 DEBUG: Checking gift box property key: ${key}, value: ${value}`);
						
						// Check if it's a gift box
						if (key === 'Add-on' && value === 'Premium Gift Box') {
							isGiftBox = true;
							console.log(`🔍 DEBUG: Item ${item.id} is a gift box`);
						}
						
						// Check if it has the matching vessel number
						if (key === 'Vessel Number' && value.toString() === vesselNumber.toString()) {
							hasMatchingVesselNumber = true;
							console.log(`🔍 DEBUG: Item ${item.id} has matching vessel number ${vesselNumber}`);
						}
					}

					// If it's a gift box with matching vessel number, add to removal list
					if (isGiftBox && hasMatchingVesselNumber) {
						// Use the key instead of id for cart API
						associatedGiftBoxIds.push(item.key);
						console.log(`🔍 DEBUG: Found associated gift box with key ${item.key} (id: ${item.id}) for vessel ${vesselNumber}`);
					}
				}

				console.log(`🔍 DEBUG: Found ${associatedGiftBoxIds.length} associated gift boxes:`, associatedGiftBoxIds);
				return associatedGiftBoxIds;

			} catch (error) {
				console.error("🔍 DEBUG: Failed to find associated gift boxes:", error);
				return [];
			}
		}

		async findAssociatedGiftBoxes(vesselItemId) {
			try {
				console.log(`🔍 DEBUG: Starting cleanup for vessel item ${vesselItemId}`);
				
				// Fetch current cart data
				const cartData = await this.fetchUpdatedCartData();
				if (!cartData || !cartData.items) {
					console.log(`🔍 DEBUG: No cart data or items found`);
					return [];
				}

				console.log(`🔍 DEBUG: Cart has ${cartData.items.length} items`);
				console.log(`🔍 DEBUG: All cart items:`, cartData.items.map(item => ({
					id: item.id,
					title: item.product_title,
					properties: item.properties
				})));

				// Find the vessel item to get its vessel number
				const vesselItem = cartData.items.find(item => item.id.toString() === vesselItemId.toString());
				if (!vesselItem) {
					console.log(`🔍 DEBUG: Vessel item ${vesselItemId} not found in cart`);
					console.log(`🔍 DEBUG: Available item IDs:`, cartData.items.map(item => item.id));
					return [];
				}

				console.log(`🔍 DEBUG: Found vessel item:`, {
					id: vesselItem.id,
					title: vesselItem.product_title,
					properties: vesselItem.properties
				});

				// Extract vessel number from the vessel item's properties
				let vesselNumber = null;
				console.log(`🔍 DEBUG: Vessel item properties:`, vesselItem.properties);
				
				// Properties are stored as an object, not an array
				for (const [key, value] of Object.entries(vesselItem.properties || {})) {
					console.log(`🔍 DEBUG: Checking property key: ${key}, value: ${value}`);
					// Look for properties like "Vessel 2 Product", "Vessel 1 Product", etc.
					if (key.includes('Vessel') && key.includes('Product')) {
						// Extract number from property name like "Vessel 2 Product"
						const vesselPropertyParts = key.split(' ');
						if (vesselPropertyParts.length >= 2) {
							vesselNumber = vesselPropertyParts[1];
							console.log(`🔍 DEBUG: Found vessel number: ${vesselNumber}`);
							break;
						}
					}
				}

				if (!vesselNumber) {
					console.log(`🔍 DEBUG: No vessel number found for item ${vesselItemId}`);
					console.log(`🔍 DEBUG: Available properties:`, vesselItem.properties);
					return [];
				}

				console.log(`🔍 DEBUG: Looking for gift boxes associated with vessel number ${vesselNumber}`);

				// Find gift boxes with matching vessel number
				const associatedGiftBoxIds = [];
				for (const item of cartData.items) {
					if (item.id.toString() === vesselItemId.toString()) {
						continue; // Skip the vessel item itself
					}

					console.log(`🔍 DEBUG: Checking item ${item.id}:`, {
						title: item.product_title,
						properties: item.properties
					});

					// Check if this item is a gift box
					let isGiftBox = false;
					let hasMatchingVesselNumber = false;

					// Properties are stored as an object, not an array
					for (const [key, value] of Object.entries(item.properties || {})) {
						console.log(`🔍 DEBUG: Checking gift box property key: ${key}, value: ${value}`);
						
						// Check if it's a gift box
						if (key === 'Add-on' && value === 'Premium Gift Box') {
							isGiftBox = true;
							console.log(`🔍 DEBUG: Item ${item.id} is a gift box`);
						}
						
						// Check if it has the matching vessel number
						if (key === 'Vessel Number' && value.toString() === vesselNumber.toString()) {
							hasMatchingVesselNumber = true;
							console.log(`🔍 DEBUG: Item ${item.id} has matching vessel number ${vesselNumber}`);
						}
					}

					// If it's a gift box with matching vessel number, add to removal list
					if (isGiftBox && hasMatchingVesselNumber) {
						// Use the key instead of id for cart API
						associatedGiftBoxIds.push(item.key);
						console.log(`🔍 DEBUG: Found associated gift box with key ${item.key} (id: ${item.id}) for vessel ${vesselNumber}`);
					}
				}

				console.log(`🔍 DEBUG: Found ${associatedGiftBoxIds.length} associated gift boxes:`, associatedGiftBoxIds);
				return associatedGiftBoxIds;

			} catch (error) {
				console.error("🔍 DEBUG: Failed to find associated gift boxes:", error);
				return [];
			}
		}


		bindCheckoutItemEvents() {
			// Re-bind remove item events for dynamically loaded content
			const removeButtons = this.modal.querySelectorAll("[data-remove-item]");
			removeButtons.forEach(button => {
				button.addEventListener('click', (event) => {
					event.preventDefault();
					const itemId = button.getAttribute('data-remove-item');
					if (itemId) {
						this.removeCartItem(itemId);
					}
				});
			});
		}

		// REMOVED: renderCheckoutItemsWithBetterData and related functions - using Liquid templates instead

		// REMOVED: isGiftBoxItem, renderCheckoutItem, renderItemProperties, renderGiftBoxItem - using Liquid templates instead

		async removeCartItem(itemId) {
			console.log(`🗑️ REMOVE ITEM: Starting removal of item ${itemId}`);
			
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
				if (itemId === "gift-box") {
					// Use the existing gift box removal method if available
					if (
						window.cartManager &&
						typeof window.cartManager.removeGiftBox === "function"
					) {
						await window.cartManager.removeGiftBox();
						// Fetch updated cart data
						cartData = await this.fetchUpdatedCartData();
					} else {
						console.warn("Gift box removal method not available");
						return;
					}
				} else {
					console.log(`🗑️ REMOVE ITEM: Processing regular item removal for ${itemId}`);
					
					// Get current cart data BEFORE removing the main item
					const currentCartData = await this.fetchUpdatedCartData();
					
					// Find associated gift boxes BEFORE removing the main item
					const associatedGiftBoxIds = await this.findAssociatedGiftBoxesFromCartData(itemId, currentCartData);
					
					console.log(`🗑️ REMOVE ITEM: Found ${associatedGiftBoxIds.length} associated gift boxes to remove:`, associatedGiftBoxIds);

					// Remove the main item first
					const response = await fetch("/cart/change.js", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							id: itemId,
							quantity: 0,
						}),
					});

					if (!response.ok) {
						throw new Error(`Failed to remove item: ${response.status}`);
					}

					cartData = await response.json();

					// Remove associated gift boxes
					if (associatedGiftBoxIds.length > 0) {
						console.log(`🎁 Removing ${associatedGiftBoxIds.length} associated gift boxes`);
						console.log(`🎁 Gift box IDs to remove:`, associatedGiftBoxIds);
						
						for (const giftBoxId of associatedGiftBoxIds) {
							console.log(`🎁 Attempting to remove gift box with ID: ${giftBoxId}`);
							console.log(`🎁 Request body:`, JSON.stringify({
								id: giftBoxId,
								quantity: 0,
							}));
							try {
								const giftBoxResponse = await fetch("/cart/change.js", {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										Accept: "application/json",
									},
									body: JSON.stringify({
										id: giftBoxId,
										quantity: 0,
									}),
								});

								console.log(`🎁 Gift box removal response status:`, giftBoxResponse.status);

								if (giftBoxResponse.ok) {
									const responseData = await giftBoxResponse.json();
									console.log(`✅ Removed gift box ${giftBoxId}`, responseData);
								} else {
									const errorText = await giftBoxResponse.text();
									console.warn(`⚠️ Failed to remove gift box ${giftBoxId}: ${giftBoxResponse.status}`, errorText);
								}
							} catch (giftBoxError) {
								console.error(`❌ Error removing gift box ${giftBoxId}:`, giftBoxError);
							}
						}

						console.log(`🎁 Finished removing gift boxes, fetching updated cart data...`);
						// Fetch updated cart data after removing gift boxes
						cartData = await this.fetchUpdatedCartData();
						console.log(`🎁 Updated cart data:`, cartData);
					} else {
						console.log(`🎁 No gift boxes to remove`);
					}
				}

				// Update the checkout view with the new cart state
				await this.updateCheckoutView(cartData);

				// Update cart UI if cart drawer exists
				if (window.cart && typeof window.cart.renderContents === "function") {
					window.cart.renderContents(cartData);
				}

			} catch (error) {
				console.error("Failed to remove cart item:", error);
				// Show error message to user
				this.showRemoveItemError(error.message);
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
					// In checkout view, only hide footer if context allows it
					const shouldShowFooter = this.shouldShowFooter(false); // Cart is empty if we're hiding sections
					if (!shouldShowFooter) {
						footer.style.display = "none";
					}
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
						max-width: 300px;
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
			this.calculatePricing();
			this.switchView("personalize");
		}

		destroy() {
			// Clean up components
			if (this.swiper) {
				this.swiper.destroy();
			}

			if (this.countdown) {
				this.countdown.destroy();
			}

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
		const modals = document.querySelectorAll(".mini-atc-modal");
		const instances = new Map();

		modals.forEach((modal, index) => {
			const instance = new MiniATCModal(modal);
			instances.set(modal.id, instance);

			// Make instance globally accessible
			const globalName = `miniATCModal_${modal.dataset.modalId || modal.id}`;
			window[globalName] = instance;
		});

		// Global API
		window.MiniATCModal = {
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

		return instances;
	}

	// Initialize when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initializeModals);
	} else {
		initializeModals();
	}

	// Dispatch custom event when modal system is ready
	document.addEventListener("DOMContentLoaded", function () {
		setTimeout(() => {
			if (window.MiniATCModal) {
				document.dispatchEvent(new CustomEvent("miniATCModalReady"));
			}
		}, 100);
	});

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

	// Export for module systems
	if (typeof module !== "undefined" && module.exports) {
		module.exports = { MiniATCModal, PersonalizationState, PricingCalculator };
	}
})();
