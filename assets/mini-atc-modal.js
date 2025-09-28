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
				engraving: { enabled: false, vessels: {} },
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

				// Update checkout view with new cart items
				await this.updateCheckoutView(response);

				// Show success feedback
				this.showAddToCartSuccess(cartData.items.length);

				// Optional: redirect to cart page after delay
				// setTimeout(() => {
				//   window.location.href = window.routes.cart_url || '/cart';
				// }, 2000);
			} catch (error) {
				console.error("Add to cart error:", error);
				this.handleAddToCartError(error.message);
			} finally {
				this.setLoadingState(false);
			}
		}

		collectCartData() {
			const state = this.state.getState();

			const items = [];

			// 1. Collect vessel products from POMC system
			const vesselItems = this.collectVesselProducts(state);
			items.push(...vesselItems);

			// 2. Collect add-on products (gift box, mix & match, extra cups)
			const addonItems = this.collectAddonProducts(state);
			items.push(...addonItems);

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

					// Use Liquid template approach - reload the checkout view with fresh cart data
					await this.loadCheckoutViewWithLiquidTemplate(cartData);
				}

			} catch (error) {
				console.error("Failed to update checkout view:", error);
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

		async loadCheckoutViewWithLiquidTemplate(cartData) {
			try {
				// The Liquid template approach won't work via AJAX since it needs cart context
				// Let's use enhanced JavaScript rendering with better debugging
				console.log("🛒 Using enhanced JavaScript rendering with debugging");
				await this.renderCheckoutItemsWithBetterData(cartData);
			} catch (error) {
				console.error("Failed to load checkout view:", error);
				// Fallback to enhanced JavaScript rendering
				await this.renderCheckoutItemsWithBetterData(cartData);
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

		async renderCheckoutItemsWithBetterData(cartData) {
			// Enhanced method with comprehensive debugging
			const checkoutContainer = this.modal.querySelector("[data-checkout-items]");
			if (!checkoutContainer) return;

			// Clear existing items
			const existingItems = checkoutContainer.querySelectorAll(".checkout-product-item-wrap");
			existingItems.forEach((item) => item.remove());

			// COMPREHENSIVE DEBUGGING
			console.log("🔍 COMPREHENSIVE CART DEBUG:");
			console.log("📊 Total cart items:", cartData.items.length);
			console.log("📋 Full cart data:", cartData);
			console.log("📝 Cart note:", cartData.note);
			console.log("🏷️ Cart attributes:", cartData.attributes);

			// Debug each item individually
			cartData.items.forEach((item, index) => {
				console.log(`\n🔍 ITEM ${index + 1}:`, {
					id: item.id,
					title: item.product_title,
					handle: item.handle,
					variant_title: item.variant_title,
					product_type: item.product_type,
					vendor: item.vendor,
					price: item.price,
					final_price: item.final_price,
					quantity: item.quantity,
					properties: item.properties,
					keys: Object.keys(item)
				});

				// Check for gift box indicators
				const giftBoxIndicators = {
					title_contains_gift: (item.product_title || '').toLowerCase().includes('gift'),
					title_contains_box: (item.product_title || '').toLowerCase().includes('box'),
					title_contains_premium: (item.product_title || '').toLowerCase().includes('premium'),
					handle_contains_gift: (item.handle || '').toLowerCase().includes('gift'),
					handle_contains_box: (item.handle || '').toLowerCase().includes('box'),
					has_addon_property: item.properties && item.properties["Add-on"] === "Premium Gift Box",
					has_product_handle: item.properties && item.properties["Product Handle"] === "premium-gift-box-tissue-wrap"
				};

				console.log("🎁 Gift box indicators:", giftBoxIndicators);
				console.log("🎁 Is gift box?", this.isGiftBoxItem(item));
			});

			// Render items using the existing methods but with enhanced detection
			for (const item of cartData.items.slice(0, 3)) {
				let itemElement;
				
				// Enhanced gift box detection with debugging
				const isGiftBox = this.isGiftBoxItem(item);
				console.log(`\n🎨 RENDERING ITEM: "${item.product_title}"`);
				console.log("🎁 Is gift box?", isGiftBox);
				
				if (isGiftBox) {
					console.log("🎁 Rendering as gift box item");
					itemElement = await this.renderGiftBoxItem(item);
				} else {
					console.log("📦 Rendering as regular item");
					itemElement = await this.renderCheckoutItem(item);
				}
				
				if (itemElement) {
					checkoutContainer.appendChild(itemElement);
					console.log("✅ Item rendered successfully");
				} else {
					console.log("❌ Failed to render item");
				}
			}

			console.log("🏁 Rendering complete. Total items in DOM:", checkoutContainer.children.length);
		}

		isGiftBoxItem(item) {
			// Enhanced gift box detection with multiple criteria
			return (
				(item.product_title && item.product_title.toLowerCase().includes('gift box')) ||
				(item.product_title && item.product_title.toLowerCase().includes('premium')) ||
				(item.handle && item.handle.toLowerCase().includes('gift-box')) ||
				(item.properties && item.properties["Add-on"] === "Premium Gift Box") ||
				(item.properties && item.properties["Product Handle"] === "premium-gift-box-tissue-wrap") ||
				(item.product_type && item.product_type.toLowerCase().includes('gift'))
			);
		}

		async renderCheckoutItem(item) {
			try {
				// Create a checkout item element similar to checkout-products-wrap snippet
				const itemWrapper = document.createElement("div");
				itemWrapper.className = "checkout-product-item-wrap";

				// Get product image URL
				const imageUrl = item.image
					? item.image.replace(/\.(jpg|jpeg|png|gif|webp)/, "_128x128.$1")
					: null;

				// Format price
				const formatPrice = (cents) => {
					return new Intl.NumberFormat("en-GB", {
						style: "currency",
						currency: "GBP",
					}).format(cents / 100);
				};

				// Build the HTML structure
				itemWrapper.innerHTML = `
					<div class="checkout-products-wrap" data-item-id="${item.id}">
						<div class="checkout-products-wrap__container">
							<!-- Product Image Section -->
							<div class="checkout-products-wrap__image">
								<div class="checkout-products-wrap__image-container">
									${
										imageUrl
											? `
										<img 
											src="${imageUrl}"
											alt="${item.product_title || "Product"}"
											width="128"
											height="128"
											loading="lazy"
											class="checkout-products-wrap__product-image"
										/>
									`
											: `
										<div class="checkout-products-wrap__placeholder">
											<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
												<rect width="128" height="128" fill="#f3f3f3"/>
												<text x="64" y="64" text-anchor="middle" dy=".3em" fill="#666">No Image</text>
											</svg>
										</div>
									`
									}
								</div>
							</div>

							<!-- Product Details Section -->
							<div class="checkout-products-wrap__details">
								<!-- Product Title and Delete Button -->
								<div class="checkout-products-wrap__header">
									<h3 class="checkout-products-wrap__title">
										${item.product_title || "Product"}
									</h3>
									<button 
										type="button" 
										class="checkout-products-wrap__delete"
										data-remove-item="${item.id}"
										aria-label="Remove ${item.product_title || "item"} from cart"
									>
										<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M3 6H5H21" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
											<path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
											<path d="M10 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
											<path d="M14 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
									</button>
								</div>

								<!-- Product Options/Chips -->
								<div class="checkout-products-wrap__options">
									${this.renderItemProperties(item)}
								</div>

								<!-- Pricing Section -->
								<div class="checkout-products-wrap__pricing">
									${
										item.original_price !== item.final_price
											? `
										<span class="checkout-products-wrap__current-price">
											${formatPrice(item.final_price)}
										</span>
										<span class="checkout-products-wrap__original-price">
											${formatPrice(item.original_price)}
										</span>
									`
											: `
										<span class="checkout-products-wrap__current-price">
											${formatPrice(item.original_price)}
										</span>
									`
									}
								</div>
							</div>
						</div>
					</div>
				`;

				return itemWrapper;
			} catch (error) {
				console.error("Failed to render checkout item:", error);
				return null;
			}
		}

		renderItemProperties(item) {
			let propertiesHtml = "";

			// Handle item properties - only show specific add-on properties, not vessel details
			if (item.properties && Object.keys(item.properties).length > 0) {
				Object.entries(item.properties).forEach(([key, value]) => {
					if (!key.startsWith('_') && value) {
						// Only show specific add-on properties, not vessel configuration details
						if (key === 'Add-on' || 
							key.toLowerCase().includes('mix') || 
							key.toLowerCase().includes('extra') ||
							key.toLowerCase().includes('gift')) {
							
							let emoji = '';
							if (key === 'Add-on') {
								emoji = '🎁 ';
							} else if (key.toLowerCase().includes('mix')) {
								emoji = '🔄 ';
							} else if (key.toLowerCase().includes('extra')) {
								emoji = '➕ ';
							}
							
							propertiesHtml += `
								<div class="checkout-products-wrap__option-chip">
									${emoji}${key}: ${value}
								</div>
							`;
						}
					}
				});
			}

			// Add default CHUUG options if it's a CHUUG product
			if (
				item.product_title &&
				(item.product_title.includes("CHUUG") ||
					item.product_title.includes("Chuug"))
			) {
				// Check for engraving and insulated cup in properties
				let engravingText = "";
				let hasInsulatedCup = false;

				if (item.properties) {
					Object.entries(item.properties).forEach(([key, value]) => {
						if (key.toLowerCase().includes("engraving") && value) {
							engravingText = value;
						}
						// Check for insulated cup property
						if (
							key.toLowerCase().includes("insulated") ||
							key.toLowerCase().includes("cup") ||
							key.toLowerCase().includes("silver cup") ||
							(key.toLowerCase().includes("silver") &&
								key.toLowerCase().includes("insulated"))
						) {
							hasInsulatedCup = true;
						}
					});
				}

				if (engravingText) {
					propertiesHtml += `
						<div class="checkout-products-wrap__option-chip">
							🔨 Engraved Initials, ${engravingText}
						</div>
					`;
				}

				// Only show insulated cup if the property exists
				if (hasInsulatedCup) {
					propertiesHtml += `
						<div class="checkout-products-wrap__option-chip">
							🍺 Silver Insulated Cup
						</div>
					`;
				}
			}

			return propertiesHtml;
		}

		async renderGiftBoxItem(item) {
			try {
				// Create a gift box item element using the premium-gift-box structure
				const itemWrapper = document.createElement("div");
				itemWrapper.className = "checkout-product-item-wrap";

				// Get product image URL
				const imageUrl = item.image
					? item.image.replace(/\.(jpg|jpeg|png|gif|webp)/, "_71x89.$1")
					: null;

				// Format price
				const formatPrice = (cents) => {
					return new Intl.NumberFormat("en-GB", {
						style: "currency",
						currency: "GBP",
					}).format(cents / 100);
				};

				// Build the HTML structure using the premium-gift-box component structure
				itemWrapper.innerHTML = `
					<div class="premium-gift-box">
						<div class="premium-gift-box__container">
							<!-- Product Image -->
							<div class="premium-gift-box__image">
								${
									imageUrl
										? `
									<img 
										src="${imageUrl}"
										alt="${item.product_title || 'Premium Gift Box & Wrap'}"
										width="71"
										height="89"
									/>
								`
										: `
									<img 
										src="${window.Shopify?.routes?.root || ''}/assets/premium-gift-box.png"
										alt="Premium Gift Box & Wrap"
										width="71"
										height="89"
									/>
								`
								}
							</div>
							
							<!-- Content Area -->
							<div class="premium-gift-box__content">
								<div class="premium-gift-box__details">
									<div class="premium-gift-box__text">
										<h4 class="premium-gift-box__title">
											${item.product_title || 'Premium Gift Box & Wrap<br>With All CHUUG Orders'}
										</h4>
									</div>
									<div class="premium-gift-box__price">
										${formatPrice(item.final_price || item.original_price)}
									</div>
								</div>
								
								<!-- Remove Button -->
								<button 
									type="button" 
									class="checkout-products-wrap__delete"
									data-remove-item="${item.id}"
									aria-label="Remove Premium Gift Box from cart"
								>
									<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M3 6H5H21" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M10 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M14 11V17" stroke="#969393" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</button>
							</div>
						</div>
					</div>
				`;

				return itemWrapper;
			} catch (error) {
				console.error("Failed to render gift box item:", error);
				return null;
			}
		}

		async removeCartItem(itemId) {
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
					// Remove regular item from Shopify cart
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
