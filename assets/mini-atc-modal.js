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

(function() {
  'use strict';

  // ============================================
  // CONSTANTS AND CONFIGURATION
  // ============================================
  
  const CONFIG = {
    STORAGE_KEY: 'chuug_mini_atc_selections',
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 500,
    SWIPER_CONFIG: {
      loop: false,
      speed: 300,
      effect: 'slide',
      touchRatio: 1,
      touchAngle: 45,
      grabCursor: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      a11y: {
        prevSlideMessage: 'Previous product image',
        nextSlideMessage: 'Next product image',
      }
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  const Utils = {
    debounce(func, delay) {
      let timeoutId;
      return function(...args) {
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
      return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
    },

    trapFocus(element) {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
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

      element.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        element.removeEventListener('keydown', handleTabKey);
      };
    }
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
        console.warn('Failed to save to localStorage:', error);
        return false;
      }
    },

    load(key) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return null;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
        return false;
      }
    }
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
        this.events[event].forEach(callback => callback(data));
      }
    }

    off(event, callback) {
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
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
          vessels: {}
        },
        mixMatch: {
          enabled: true,
          variants: {}
        },
        extraCups: {
          enabled: false,
          variants: {}
        },
        giftBox: {
          enabled: false
        }
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
      this.emit('personalizationChanged', { type, data: this.state[type] });
    }

    updateVariantQuantity(type, variantId, quantity) {
      if (!this.state[type].variants) {
        this.state[type].variants = {};
      }
      
      this.state[type].variants[variantId] = Math.max(0, quantity);
      this.saveState();
      this.emit('variantChanged', { type, variantId, quantity });
    }

    updateVesselEngraving(vesselId, text) {
      if (!this.state.engraving.vessels) {
        this.state.engraving.vessels = {};
      }
      this.state.engraving.vessels[vesselId] = Utils.sanitizeInput(text);
      this.saveState();
      this.emit('vesselChanged', { vesselId, text: this.state.engraving.vessels[vesselId] });
    }

    getState() {
      return { ...this.state };
    }

    reset() {
      this.state = {
        engraving: { enabled: true, vessels: {} },
        mixMatch: { enabled: true, variants: {} },
        extraCups: { enabled: false, variants: {} },
        giftBox: { enabled: false }
      };
      StorageManager.remove(CONFIG.STORAGE_KEY);
      this.emit('stateReset');
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
      if (typeof Swiper !== 'undefined') {
        this.createSwiper();
      } else {
        // Fallback for manual dot navigation
        this.setupFallbackNavigation();
      }
    }

    createSwiper() {
      const paginationEl = this.container.parentElement.querySelector('.mini-atc-modal__image-dots');
      
      this.swiper = new Swiper(this.container, {
        ...this.config,
        pagination: {
          el: paginationEl,
          clickable: true,
          bulletClass: 'dot',
          bulletActiveClass: 'active',
          renderBullet: (index, className) => `<button class="${className}" aria-label="View product image ${index + 1}" data-slide="${index}"></button>`,
        }
      });
    }

    setupFallbackNavigation() {
      const dots = this.container.parentElement.querySelectorAll('.dot');
      const slides = this.container.querySelectorAll('.swiper-slide');
      
      if (!dots.length || !slides.length) return;

      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          this.goToSlide(index);
        });
      });
    }

    goToSlide(index) {
      const slides = this.container.querySelectorAll('.swiper-slide');
      const dots = this.container.parentElement.querySelectorAll('.dot');
      
      if (this.swiper) {
        this.swiper.slideTo(index);
      } else {
        // Fallback manual slide management
        slides.forEach((slide, i) => {
          slide.style.display = i === index ? 'flex' : 'none';
        });
        
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }
    }

    updateProductImage(imageSrc, altText = 'CHUUG Vessel') {
      const firstSlide = this.container.querySelector('.swiper-slide img');
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
    constructor(element, duration = 24 * 60 * 60) { // 24 hours default
      this.element = element;
      this.duration = duration;
      this.startTime = this.getStartTime();
      this.timer = null;
      this.init();
    }

    getStartTime() {
      const storageKey = 'chuug_countdown_start';
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
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');

      if (this.element) {
        this.element.textContent = formattedTime;
      }
    }

    reset() {
      this.startTime = Math.floor(Date.now() / 1000);
      StorageManager.save('chuug_countdown_start', this.startTime);
      if (this.element) {
        this.element.textContent = '24:00:00';
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
      this.basePrices = {
        product: 7800, // £78.00 in cents
        giftBox: 200,  // £2.00 in cents (fallback)
        variant: 1299, // £12.99 in cents
        originalPrice: 18000 // £180.00 in cents (updated to match actual data)
      };
      this.dynamicPrices = {
        giftBox: null // Will be updated from product data
      };
    }

    calculateTotal(state) {
      let total = 0;
      let originalTotal = 0;
      
      // Calculate pricing based on POMC system vessel selections
      if (window.pomcSystem) {
        const vesselSelections = window.pomcSystem.getAllVesselSelections();
        const multiplier = window.pomcSystem.getMultiplier();
        const selectedProductAmountData = window.pomcSystem.getSelectedProductAmountData();
        
        console.log('Calculating pricing with POMC data:', {
          multiplier,
          selectedProductAmountData,
          vesselSelections
        });
        
        // Get pricing for the current vessel count (1x, 2x, or 3x)
        const vesselPricing = this.getVesselPricingForMultiplier(multiplier);
        if (vesselPricing) {
          total = vesselPricing.price;
          originalTotal = vesselPricing.originalPrice;
          
          console.log('Using vessel pricing:', vesselPricing);
        } else {
          console.log('No vessel pricing found, using fallback');
        }
      } else {
        console.log('POMC system not available, using fallback pricing');
      }
      
      // Fallback to base pricing if no POMC data
      if (total === 0) {
        total = this.basePrices.product;
        originalTotal = this.basePrices.originalPrice;
        console.log('Using fallback pricing:', { total, originalTotal });
      }
      
      // Add gift box if enabled
      if (state.giftBox?.enabled) {
        const giftBoxPrice = this.dynamicPrices.giftBox || this.basePrices.giftBox;
        total += giftBoxPrice;
        // Gift box doesn't affect original price
      }
      
      // Add mix & match variants
      if (state.mixMatch?.enabled && state.mixMatch.variants) {
        Object.values(state.mixMatch.variants).forEach(quantity => {
          const variantPrice = quantity * this.basePrices.variant;
          total += variantPrice;
        });
      }
      
      // Add extra cups variants
      if (state.extraCups?.enabled && state.extraCups.variants) {
        Object.values(state.extraCups.variants).forEach(quantity => {
          const variantPrice = quantity * this.basePrices.variant;
          total += variantPrice;
        });
      }

      const savings = originalTotal - total;

      const pricingData = {
        total,
        originalPrice: originalTotal,
        savings,
        formattedTotal: Utils.formatPrice(total),
        formattedOriginal: Utils.formatPrice(originalTotal),
        formattedSavings: Utils.formatPrice(savings)
      };

      this.emit('priceCalculated', pricingData);

      return { total, originalPrice, savings };
    }

    getVesselPricing(selection) {
      // Get pricing from the modal configuration that matches vessel-number-wrap
      const config = this.modal.querySelector('[data-mini-atc-config]');
      if (!config) {
        return { price: 7800, originalPrice: 19000 };
      }
      
      try {
        const modalConfig = JSON.parse(config.textContent);
        const vesselPricing = modalConfig.pricing?.vesselPricing;
        
        if (!vesselPricing) {
          return { price: 7800, originalPrice: 19000 };
        }
        
        // Get the current multiplier from POMC system
        const multiplier = window.pomcSystem ? window.pomcSystem.getMultiplier() : 1;
        const vesselKey = multiplier === 1 ? 'one' : multiplier === 2 ? 'two' : 'three';
        
        // Check if engraving is enabled (this would need to be determined from the current state)
        // For now, we'll use noEngraving as default, but this should be dynamic
        const engravingEnabled = this.isEngravingEnabled();
        const priceKey = engravingEnabled ? 'engraving' : 'noEngraving';
        const compareAtKey = engravingEnabled ? 'compareAtEngraving' : 'compareAtNoEngraving';
        
        const pricing = vesselPricing[vesselKey];
        if (pricing) {
          return {
            price: pricing[priceKey] || 7800,
            originalPrice: pricing[compareAtKey] || 19000
          };
        }
      } catch (error) {
        console.warn('Failed to parse modal configuration:', error);
      }
      
      // Fallback pricing
      return { price: this.basePrices.product, originalPrice: this.basePrices.originalPrice };
    }
    
    
    getVesselPricingForMultiplier(multiplier) {
      console.log('getVesselPricingForMultiplier called with multiplier:', multiplier);
      
      // First try to get pricing from POMC system selectedProductAmountData
      if (window.pomcSystem) {
        const selectedProductAmountData = window.pomcSystem.getSelectedProductAmountData();
        console.log('POMC selectedProductAmountData:', selectedProductAmountData);
        
        if (selectedProductAmountData) {
          console.log('Using selectedProductAmountData for pricing:', selectedProductAmountData);
          
          // Check if engraving is enabled - we'll get this from the modal instance
          const engravingEnabled = this.getEngravingState();
          const variantIndex = engravingEnabled ? 1 : 0;
          
          // Get the variant data
          const variant = selectedProductAmountData.variants[variantIndex];
          const price = variant?.price || selectedProductAmountData.price || 7800;
          const compareAtPrice = variant?.compare_at_price || selectedProductAmountData.compare_at_price || 18000;
          
          console.log('Variant pricing data:', {
            variantIndex,
            engravingEnabled,
            variant,
            price,
            compareAtPrice,
            selectedProductAmountData,
            formattedPrice: Utils.formatPrice(price),
            formattedCompareAtPrice: Utils.formatPrice(compareAtPrice)
          });
          
          return {
            price: price,
            originalPrice: compareAtPrice
          };
        }
      }
      
      // Fallback to modal configuration
      const config = this.modal.querySelector('[data-mini-atc-config]');
      if (!config) {
        return { price: 7800, originalPrice: 19000 };
      }
      
      try {
        const modalConfig = JSON.parse(config.textContent);
        const vesselPricing = modalConfig.pricing?.vesselPricing;
        
        if (!vesselPricing) {
          return { price: 7800, originalPrice: 19000 };
        }
        
        // Get the vessel key based on multiplier
        const vesselKey = multiplier === 1 ? 'one' : multiplier === 2 ? 'two' : 'three';
        
            // Check if engraving is enabled
            const engravingEnabled = this.getEngravingState();
            const priceKey = engravingEnabled ? 'engraving' : 'noEngraving';
            const compareAtKey = engravingEnabled ? 'compareAtEngraving' : 'compareAtNoEngraving';
        
        const pricing = vesselPricing[vesselKey];
        if (pricing) {
          return {
            price: pricing[priceKey] || 7800,
            originalPrice: pricing[compareAtKey] || 19000
          };
        }
      } catch (error) {
        console.warn('Failed to parse modal configuration:', error);
      }
      
      // Fallback pricing
      return { price: this.basePrices.product, originalPrice: this.basePrices.originalPrice };
    }

    updateGiftBoxPrice(priceInCents) {
      this.dynamicPrices.giftBox = priceInCents;
      console.log('Updated gift box price:', priceInCents);
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
      this.currentView = 'personalize';
      this.focusTrap = null;
      
      // Initialize components
      this.state = new PersonalizationState();
      this.pricing = new PricingCalculator(this); // Pass modal instance to pricing calculator
      this.swiper = null;
      this.countdown = null;
      
      this.init();
    }

    loadConfig() {
      const configScript = document.querySelector(`[data-mini-atc-config="${this.modal.id}"]`);
      if (configScript) {
        try {
          return JSON.parse(configScript.textContent);
        } catch (error) {
          console.warn('Failed to parse modal config:', error);
        }
      }
      return {};
    }

    init() {
      this.bindEvents();
      this.initializeComponents();
      this.setupAccessibility();
      this.initializeGiftBoxPricing();
    }

    bindEvents() {
      // Modal open/close events
      this.modal.addEventListener('click', this.handleModalClick.bind(this));
      
      // Keyboard events
      document.addEventListener('keydown', this.handleKeydown.bind(this));
      
      // Toggle events
      this.modal.addEventListener('change', this.handleToggleChange.bind(this));
      
      // Counter events
      this.modal.addEventListener('click', this.handleCounterClick.bind(this));
      
      // Input events
      this.modal.addEventListener('input', this.handleVesselInput.bind(this));
      
      // State change events
      this.state.on('personalizationChanged', this.handlePersonalizationChange.bind(this));
      this.state.on('variantChanged', this.handleVariantChange.bind(this));
      this.state.on('vesselChanged', this.handleVesselChange.bind(this));
      
      // Pricing events
      this.pricing.on('priceCalculated', this.updatePricingDisplay.bind(this));
      
      // Listen for POMC system changes to update pricing
      this.setupPOMCIntegration();
    }

    initializeComponents() {
      // Initialize Swiper
      const swiperContainer = this.modal.querySelector('.mini-atc-product-swiper');
      if (swiperContainer) {
        this.swiper = new ProductImageSwiper(swiperContainer);
      }

      // Initialize countdown timer
      const countdownElement = this.modal.querySelector('.countdown-timer__time');
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
      this.modal.setAttribute('aria-hidden', 'true');
      
      // Set up focus management
      const closeButton = this.modal.querySelector('[data-modal-close]');
      if (closeButton) {
        closeButton.setAttribute('aria-label', closeButton.getAttribute('aria-label') || 'Close modal');
        
        // Add direct event listener as backup
        closeButton.addEventListener('click', (event) => {
          console.log('Direct close button click detected');
          event.preventDefault();
          event.stopPropagation();
          this.close();
        });
      }
    }

    initializeVesselInputs() {
      // Find all vessel toggles and sync their corresponding inputs
      const vesselToggles = this.modal.querySelectorAll('[data-vessel-toggle]');
      
      vesselToggles.forEach(toggle => {
        const vesselId = toggle.getAttribute('data-vessel-toggle');
        const input = toggle.closest('.vessel-personalization-row')?.querySelector('.vessel-name-input');
        
        if (input) {
          // Enable/disable input based on toggle state
          input.disabled = !toggle.checked;
          
          // If toggle is checked, ensure input is enabled
          if (toggle.checked) {
            input.removeAttribute('disabled');
          }
        }
      });
    }

    handleModalClick(event) {
      console.log('Modal click detected:', event.target, event.target.classList);
      
      // Handle overlay clicks
      if (event.target.classList.contains('mini-atc-modal__overlay')) {
        console.log('Overlay click detected, closing modal');
        this.close();
        return;
      }

      // Handle close button clicks
      const closeButton = event.target.closest('[data-modal-close]');
      if (closeButton) {
        console.log('Close button click detected, closing modal');
        event.preventDefault();
        event.stopPropagation();
        this.close();
        return;
      }

      // Handle action button clicks
      const action = event.target.closest('[data-modal-action]');
      if (action) {
        const actionType = action.getAttribute('data-modal-action');
        this.handleAction(actionType);
      }
    }

    handleKeydown(event) {
      if (!this.isActive) return;

      if (event.key === 'Escape') {
        this.close();
      }
    }

    handleToggleChange(event) {
      const toggle = event.target.closest('[data-personalization-toggle], [data-addon-toggle], [data-vessel-toggle]');
      if (!toggle) return;

      if (toggle.hasAttribute('data-personalization-toggle')) {
        const type = toggle.getAttribute('data-personalization-toggle');
        this.state.updatePersonalization(type, { enabled: toggle.checked });
      } else if (toggle.hasAttribute('data-addon-toggle')) {
        const type = toggle.getAttribute('data-addon-toggle');
        this.state.updatePersonalization(type, { enabled: toggle.checked });
      } else if (toggle.hasAttribute('data-vessel-toggle')) {
        const vesselId = toggle.getAttribute('data-vessel-toggle');
        const input = toggle.closest('.vessel-personalization-row').querySelector('.vessel-name-input');
        if (input) {
          input.disabled = !toggle.checked;
          if (!toggle.checked) {
            input.value = '';
            this.state.updateVesselEngraving(vesselId, '');
          }
        }
      }

      this.toggleOptionsVisibility(toggle);
    }

    handleCounterClick(event) {
      const counterBtn = event.target.closest('[data-variant-action]');
      if (!counterBtn) return;

      const action = counterBtn.getAttribute('data-variant-action');
      const variantId = counterBtn.getAttribute('data-variant-id');
      const counter = counterBtn.closest('.mini-atc-modal__counter');
      const valueEl = counter.querySelector('[data-variant-quantity]');
      
      if (!valueEl || !variantId) return;

      let currentValue = parseInt(valueEl.textContent) || 0;
      
      if (action === 'increment') {
        currentValue = Math.min(currentValue + 1, 99);
      } else if (action === 'decrement') {
        currentValue = Math.max(currentValue - 1, 0);
      }

      valueEl.textContent = currentValue;
      
      // Visual feedback
      valueEl.style.transform = 'scale(1.1)';
      setTimeout(() => {
        valueEl.style.transform = 'scale(1)';
      }, 150);

      // Update variant price
      this.updateVariantPrice(counter, currentValue);
      
      // Determine personalization type
      const personalizationEl = counterBtn.closest('[data-personalization]');
      let type = personalizationEl?.getAttribute('data-personalization') || 'mixMatch';
      
      // Convert kebab-case to camelCase for state consistency
      if (type === 'mix-match') {
        type = 'mixMatch';
      } else if (type === 'extra-cups') {
        type = 'extraCups';
      }
      
      this.state.updateVariantQuantity(type, variantId, currentValue);
    }

    handleVesselInput(event) {
      const input = event.target.closest('[data-vessel-input]');
      if (!input) return;

      const vesselId = input.getAttribute('data-vessel-input');
      const sanitizedValue = Utils.sanitizeInput(input.value);
      
      if (input.value !== sanitizedValue) {
        input.value = sanitizedValue;
      }
      
      this.state.updateVesselEngraving(vesselId, sanitizedValue);
    }

    handleAction(actionType) {
      switch (actionType) {
        case 'add-to-cart':
          this.switchView('checkout');
          break;
        case 'back-to-personalize':
          this.switchView('personalize');
          break;
        case 'proceed-to-checkout':
          this.proceedToCheckout();
          break;
        default:
          console.warn('Unknown action type:', actionType);
      }
    }

    handlePersonalizationChange(data) {
      this.calculatePricing();
      this.emit('personalizationChanged', data);
    }

    handleVariantChange(data) {
      this.calculatePricing();
      this.emit('variantChanged', data);
    }

    handleVesselChange(data) {
      // Update product image if needed
      this.updateProductImageFromSelection();
      this.emit('vesselChanged', data);
    }

    toggleOptionsVisibility(toggle) {
      // Don't hide complete options for vessel personalization toggles
      // These toggles should only enable/disable individual vessel input fields
      if (toggle.hasAttribute('data-vessel-toggle')) {
        return;
      }
      
      const personalizationEl = toggle.closest('.mini-atc-modal__personalization');
      const optionsEl = personalizationEl?.querySelector('[data-personalization-content], .mini-atc-modal__complete-options');
      
      if (optionsEl) {
        if (toggle.checked) {
          optionsEl.classList.remove('mini-atc-modal__complete-options--hidden');
        } else {
          optionsEl.classList.add('mini-atc-modal__complete-options--hidden');
        }
      }
    }

    updateVariantPrice(counter, quantity) {
      const priceEl = counter.parentElement.querySelector('[data-variant-price]');
      const basePrice = parseInt(priceEl?.getAttribute('data-base-price')) || 1299;
      
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
        console.log('Updating product image based on selection:', state.engraving.vessels);
      }
    }

    async fetchVesselSelectionsAndUpdateImages() {
      try {
        // Show loading state
        this.showImageLoader();

        // Get vessel selections from POMC system
        if (!window.pomcSystem) {
          console.warn('POMC System not available for fetching vessel selections');
          this.hideImageLoader();
          return;
        }

        const allVesselSelections = window.pomcSystem.getAllVesselSelections();
        console.log('Fetched vessel selections:', allVesselSelections);
        
        // Extract product handles from vessel selections
        const productHandles = [];
        Object.values(allVesselSelections).forEach(selection => {
          if (selection.productHandle) {
            productHandles.push(selection.productHandle);
          }
        });

        if (productHandles.length === 0) {
          console.log('No product handles found in vessel selections');
          this.hideImageLoader();
          return;
        }

        console.log('Product handles to fetch:', productHandles);

        // Fetch product data for each product handle
        const productPromises = productHandles.map(productHandle => 
          this.fetchProductDataByHandle(productHandle)
        );

        const products = await Promise.all(productPromises);
        const validProducts = products.filter(product => product !== null);

        console.log('Fetched products:', validProducts);
        
        // Log media information for each product
        validProducts.forEach((product, index) => {
          console.log(`Product ${index + 1} (${product.title}):`, {
            id: product.id,
            handle: product.handle,
            images: product.images,
            media: product.media,
            featured_image: product.featured_image,
            image_count: product.images ? product.images.length : 0,
            media_count: product.media ? product.media.length : 0
          });
        });

        // Update the product image slider with the first image from each product
        this.updateProductImageSlider(validProducts);

        // Hide loading state
        this.hideImageLoader();

      } catch (error) {
        console.error('Error fetching vessel selections and updating images:', error);
        this.hideImageLoader();
      }
    }

    async fetchProductDataFromVariant(variantId) {
      try {
        // First, get the variant data to find the product ID
        const variantResponse = await fetch(`/variants/${variantId}.js`);
        if (!variantResponse.ok) {
          throw new Error(`Failed to fetch variant ${variantId}: ${variantResponse.status}`);
        }
        
        const variantData = await variantResponse.json();
        console.log(`Variant ${variantId} data:`, variantData);
        
        // Check what properties are available in the variant data
        console.log(`Variant ${variantId} keys:`, Object.keys(variantData));
        
        // Try different possible property names for product ID
        const productId = variantData.product_id || variantData.productId || variantData.product?.id;
        
        if (!productId) {
          console.error(`No product ID found in variant ${variantId} data:`, variantData);
          return null;
        }
        
        console.log(`Found product ID: ${productId} for variant ${variantId}`);
        
        // Now get the product data using the product ID from the variant
        const productResponse = await fetch(`/products/${productId}.js`);
        if (!productResponse.ok) {
          throw new Error(`Failed to fetch product ${productId}: ${productResponse.status}`);
        }
        
        const productData = await productResponse.json();
        console.log(`Product ${productId} data:`, productData);
        
        return productData;
      } catch (error) {
        console.error(`Error fetching product from variant ${variantId}:`, error);
        return null;
      }
    }


    async fetchProductDataByHandle(productHandle) {
      try {
        console.log(`Fetching product ${productHandle} via AJAX API...`);
        
        const response = await fetch(`/products/${productHandle}.js`);
        if (!response.ok) {
          throw new Error(`Failed to fetch product ${productHandle}: ${response.status}`);
        }
        
        const productData = await response.json();
        console.log(`✅ Found product ${productHandle}:`, productData);
        
        return productData;
      } catch (error) {
        console.error(`Error fetching product ${productHandle}:`, error);
        return null;
      }
    }

    async fetchProductData(productId) {
      try {
        console.log(`Fetching product ${productId} via AJAX API...`);
        
        const response = await fetch(`/products.json?ids=${productId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch product ${productId}: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Raw API response for ${productId}:`, data);
        
        if (data.products && data.products.length > 0) {
          // Find the specific product by ID
          const targetProduct = data.products.find(product => 
            product.id.toString() === productId.toString()
          );
          
          if (targetProduct) {
            console.log(`✅ Found specific product ${productId}:`, targetProduct);
            return targetProduct;
          } else {
            console.log(`❌ Product ${productId} not found in response. Available IDs:`, 
              data.products.map(p => p.id));
            return null;
          }
        } else {
          throw new Error(`Product ${productId} not found`);
        }
      } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
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

        const response = await fetch('/api/2023-10/graphql.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': window.Shopify?.storefrontAccessToken || ''
          },
          body: JSON.stringify({
            query: query,
            variables: { id: globalId }
          })
        });

        if (!response.ok) {
          console.log(`Storefront API failed for ${productId}: ${response.status}`);
          return null;
        }

        const data = await response.json();
        
        if (data.errors) {
          console.log(`Storefront API errors for ${productId}:`, data.errors);
          return null;
        }

        if (data.data?.product) {
          const product = data.data.product;
          
          // Transform to match expected format
          const transformedProduct = {
            id: product.id.replace('gid://shopify/Product/', ''),
            title: product.title,
            handle: product.handle,
            description: product.description,
            images: product.images.edges.map(edge => ({
              src: edge.node.url,
              alt: edge.node.altText,
              width: edge.node.width,
              height: edge.node.height
            })),
            variants: product.variants.edges.map(edge => ({
              id: edge.node.id.replace('gid://shopify/ProductVariant/', ''),
              title: edge.node.title,
              price: edge.node.price.amount,
              currency: edge.node.price.currencyCode,
              available: edge.node.availableForSale
            }))
          };

          console.log(`✅ Storefront API success for ${productId}:`, transformedProduct);
          return transformedProduct;
        }

        console.log(`No product found via Storefront API for ${productId}`);
        return null;
      } catch (error) {
        console.log(`Storefront API error for ${productId}:`, error.message);
        return null;
      }
    }

    updateProductImageSlider(products) {
      const swiperContainer = this.modal.querySelector('.mini-atc-product-swiper');
      const swiperWrapper = swiperContainer?.querySelector('.swiper-wrapper');
      const imageDots = this.modal.querySelector('.mini-atc-modal__image-dots');

      if (!swiperWrapper || !imageDots) {
        console.warn('Swiper container or dots not found');
        return;
      }

      // Clear all existing slides and dots
      swiperWrapper.innerHTML = '';
      imageDots.innerHTML = '';

      // Add slides and dots for each product
      products.forEach((product, index) => {
        if (product.images && product.images.length > 0) {
          // Get the main/featured image (first image is typically the main image)
          const mainImage = product.images[0];
          const imageUrl = mainImage.src || mainImage;

          // Create new slide
          const newSlide = document.createElement('div');
          newSlide.className = 'swiper-slide';
          newSlide.setAttribute('data-image-type', 'selection');
          
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
          const newDot = document.createElement('button');
          newDot.className = index === 0 ? 'dot active' : 'dot';
          newDot.setAttribute('data-slide', index);
          newDot.setAttribute('aria-label', `View product image ${index + 1}`);

          imageDots.appendChild(newDot);
        }
      });

      // Update swiper if it exists
      if (this.swiper && this.swiper.swiper) {
        this.swiper.swiper.update();
      }

      console.log(`Updated product image slider with ${products.length} products`);
    }

    showImageLoader() {
      const swiperContainer = this.modal.querySelector('.mini-atc-product-swiper');
      const swiperWrapper = swiperContainer?.querySelector('.swiper-wrapper');
      
      if (!swiperWrapper) return;

      // Create or show loading overlay
      let loader = swiperContainer.querySelector('.image-loader');
      if (!loader) {
        loader = document.createElement('div');
        loader.className = 'image-loader';
        loader.innerHTML = `
          <div class="loader-content">
            <div class="loader-spinner"></div>
            <p class="loader-text">Loading product images...</p>
          </div>
        `;
        swiperContainer.appendChild(loader);
      }

      // Add loading styles if not already present
      if (!document.querySelector('#mini-atc-loader-styles')) {
        const style = document.createElement('style');
        style.id = 'mini-atc-loader-styles';
        style.textContent = `
          .image-loader {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
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
            margin: 0 auto 16px;
          }
          
          .loader-text {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      loader.style.display = 'flex';
    }

    hideImageLoader() {
      const swiperContainer = this.modal.querySelector('.mini-atc-product-swiper');
      const loader = swiperContainer?.querySelector('.image-loader');
      
      if (loader) {
        loader.style.display = 'none';
      }
    }

    calculatePricing() {
      console.log('MiniATCModal.calculatePricing() called');
      const state = this.state.getState();
      this.pricing.calculateTotal(state);
    }

    setupPOMCIntegration() {
      // Listen for POMC system changes and update pricing
      if (window.pomcSystem) {
        // Create a custom event listener for POMC changes
        const updatePricingFromPOMC = (event) => {
          console.log('POMC system changed, updating modal pricing', event?.detail);
          this.calculatePricing();
        };

        // Listen for vessel selection changes
        document.addEventListener('pomcVesselSelectionChanged', updatePricingFromPOMC);
        document.addEventListener('pomcMultiplierChanged', updatePricingFromPOMC);
        document.addEventListener('pomcProductAmountChanged', updatePricingFromPOMC);
        
        // Also listen for the modal opening to ensure pricing is current
        this.modal.addEventListener('modalOpened', () => {
          setTimeout(updatePricingFromPOMC, 100); // Small delay to ensure POMC is ready
        });
        
        // Listen for storage changes (when POMC data is updated)
        window.addEventListener('storage', (event) => {
          if (event.key === 'chuug_vessel_selections') {
            console.log('POMC storage changed, updating modal pricing');
            updatePricingFromPOMC();
          }
        });
      }
    }
    
    setupEngravingToggleListener() {
      console.log('Setting up engraving toggle listener...');
      const engravingToggle = this.modal.querySelector('[data-personalization-toggle="engraving"]');
      
      if (engravingToggle) {
        console.log('Found engraving toggle:', engravingToggle);
        console.log('Current toggle state:', engravingToggle.checked);
        
        // Remove any existing listeners to avoid duplicates
        engravingToggle.removeEventListener('change', this.handleEngravingToggleChange);
        
        // Add the new listener
        this.handleEngravingToggleChange = (event) => {
          console.log('Engraving toggle changed:', event.target.checked);
          this.calculatePricing();
        };
        
        engravingToggle.addEventListener('change', this.handleEngravingToggleChange);
        
        console.log('Engraving toggle listener set up successfully');
      } else {
        console.warn('Engraving toggle not found in modal. Available elements:', 
          Array.from(this.modal.querySelectorAll('input[type="checkbox"]')).map(el => ({
            id: el.id,
            dataAttr: el.getAttribute('data-personalization-toggle'),
            checked: el.checked
          }))
        );
      }
    }
    
    isEngravingEnabled() {
      // First check the mini ATC modal engraving toggle
      const engravingToggle = this.modal.querySelector('[data-personalization-toggle="engraving"]');
      if (engravingToggle) {
        const toggleEnabled = engravingToggle.checked;
        console.log('Engraving toggle state:', toggleEnabled);
        return toggleEnabled;
      }
      
      // Fallback to modal state
      const state = this.state.getState();
      const engravingEnabled = state.personalization?.engraving?.enabled || false;
      
      // Also check the main product page variant index for consistency
      const inputs = document.querySelectorAll('.inputs');
      if (inputs.length > 0) {
        const variantIndex = parseInt(inputs[0].getAttribute('variant_index'), 10);
        const mainPageEngravingEnabled = variantIndex === 1;
        
        console.log('Engraving state check:', {
          modalToggle: engravingToggle?.checked,
          modalState: engravingEnabled,
          mainPageVariantIndex: variantIndex,
          mainPageEngraving: mainPageEngravingEnabled,
          usingToggle: engravingToggle?.checked
        });
        
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
        const response = await fetch('/products/premium-gift-box-tissue-wrap.js');
        if (response.ok) {
          const productData = await response.json();
          if (productData.variants && productData.variants.length > 0) {
            const variant = productData.variants[0];
            this.pricing.updateGiftBoxPrice(variant.price);
            console.log('Initialized gift box pricing from product data:', variant.price);
          }
        }
      } catch (error) {
        console.warn('Failed to initialize gift box pricing, using fallback:', error);
      }
    }

    updatePricingDisplay(pricing) {
      console.log('Updating pricing display:', pricing);
      
      // Try multiple selectors to find the price elements
      const currentPriceEl = this.modal.querySelector('[data-current-price]') || 
                            this.modal.querySelector('.mini-atc-modal__current-price');
      const originalPriceEl = this.modal.querySelector('[data-original-price]') || 
                             this.modal.querySelector('.mini-atc-modal__original-price');
      const savingsEl = this.modal.querySelector('[data-savings-amount]') || 
                       this.modal.querySelector('.mini-atc-modal__savings-text');

      if (currentPriceEl) {
        // Update the placeholder span inside the price element
        const placeholder = currentPriceEl.querySelector('.pricing-placeholder');
        if (placeholder) {
          placeholder.textContent = pricing.formattedTotal;
          console.log('Updated current price:', pricing.formattedTotal);
        } else {
          currentPriceEl.textContent = pricing.formattedTotal;
          console.log('Updated current price (no placeholder):', pricing.formattedTotal);
        }
      }
      
      if (originalPriceEl) {
        // Update the placeholder span inside the price element
        const placeholder = originalPriceEl.querySelector('.pricing-placeholder');
        if (placeholder) {
          placeholder.textContent = pricing.formattedOriginal;
          console.log('Updated original price:', pricing.formattedOriginal);
        } else {
          originalPriceEl.textContent = pricing.formattedOriginal;
          console.log('Updated original price (no placeholder):', pricing.formattedOriginal);
        }
      }
      
      if (savingsEl) {
        // Update the savings text
        const placeholder = savingsEl.querySelector('.pricing-placeholder');
        if (placeholder) {
          placeholder.textContent = `You Saved ${pricing.formattedSavings}`;
          console.log('Updated savings:', `You Saved ${pricing.formattedSavings}`);
        } else {
          savingsEl.textContent = `You Saved ${pricing.formattedSavings}`;
          console.log('Updated savings (no placeholder):', `You Saved ${pricing.formattedSavings}`);
        }
      }
    }

    switchView(viewName) {
      const views = this.modal.querySelectorAll('.mini-atc-modal__view');
      const targetView = this.modal.querySelector(`[data-view="${viewName}"]`);
      const titleEl = this.modal.querySelector('.mini-atc-modal__title');
      const addToCartBtn = this.modal.querySelector('.mini-atc-modal__add-to-cart-btn');
      const btnTextEl = addToCartBtn?.querySelector('.mini-atc-modal__btn-text');

      if (!targetView) return;

      // Update views
      views.forEach(view => {
        view.classList.remove('mini-atc-modal__view--active');
        view.setAttribute('aria-hidden', 'true');
      });

      targetView.classList.add('mini-atc-modal__view--active');
      targetView.setAttribute('aria-hidden', 'false');

      // Update title
      if (titleEl) {
        switch (viewName) {
          case 'checkout':
            titleEl.textContent = this.config.checkoutTitle || 'Proceed to Checkout';
            break;
          case 'personalize':
          default:
            titleEl.textContent = this.config.modalTitle || 'Personalise Your CHUUG';
            break;
        }
      }

      // Update button label based on view
      if (btnTextEl) {
        switch (viewName) {
          case 'checkout':
            btnTextEl.textContent = 'CHECK OUT';
            break;
          case 'personalize':
          default:
            btnTextEl.textContent = 'ADD TO CART';
            break;
        }
      }

      // Scroll to top
      const content = this.modal.querySelector('.mini-atc-modal__content');
      if (content) {
        content.scrollTop = 0;
      }

      this.currentView = viewName;
      this.emit('viewChanged', viewName);
    }

    open() {
      if (this.isActive) return;

      // Log current POMC system data when mini-atc-modal shows
      console.log('=== MINI-ATC-MODAL SHOWING ===');
      if (window.pomcSystem) {
        console.log('Current POMC System Data:', {
          allVesselSelections: window.pomcSystem.getAllVesselSelections(),
          currentProductId: window.pomcSystem.getCurrentProductId(),
          multiplier: window.pomcSystem.getMultiplier(),
          currentVesselSelection: window.pomcSystem.getCurrentVesselSelection()
        });
      } else {
        console.log('POMC System not available');
      }
      console.log('==============================');

      this.modal.classList.add('mini-atc-modal--active');
      this.modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      
      // Setup focus trap
      this.focusTrap = Utils.trapFocus(this.modal);
      
      this.isActive = true;
      this.emit('modalOpened');
      
      // Dispatch modal opened event for POMC integration
      this.modal.dispatchEvent(new CustomEvent('modalOpened'));

      // Fetch vessel selections data and update product images
      this.fetchVesselSelectionsAndUpdateImages();

      // Calculate initial pricing
      this.calculatePricing();

      // Setup engraving toggle listener now that modal is visible
      this.setupEngravingToggleListener();
      
      // Force pricing refresh to ensure it's up to date with any changes made while modal was closed
      setTimeout(() => {
        console.log('Modal opened - forcing pricing refresh');
        this.calculatePricing();
      }, 200);

      // Initialize components that need the modal to be visible
      setTimeout(() => {
        if (!this.swiper && this.modal.querySelector('.mini-atc-product-swiper')) {
          this.swiper = new ProductImageSwiper(this.modal.querySelector('.mini-atc-product-swiper'));
        }
      }, 100);
    }

    close() {
      console.log('Close method called, isActive:', this.isActive);
      
      // Check if modal is visually active (either through isActive state or CSS class)
      const isVisuallyActive = this.isActive || this.modal.classList.contains('mini-atc-modal--active');
      
      if (!isVisuallyActive) {
        console.log('Modal is not active, ignoring close request');
        return;
      }

      console.log('Closing modal...');
      this.modal.classList.remove('mini-atc-modal--active');
      this.modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      
      // Remove focus trap
      if (this.focusTrap) {
        this.focusTrap();
        this.focusTrap = null;
      }
      
      // Reset to preview (personalize) view when closing
      this.switchView('personalize');
      
      this.isActive = false;
      this.emit('modalClosed');
      console.log('Modal closed successfully');
    }

    proceedToCheckout() {
      // Future integration point for Shopify checkout
      const state = this.state.getState();
      
      console.log('Proceeding to checkout with state:', state);
      
      // This would integrate with Shopify cart API
      // Example:
      // await this.addToCart(state);
      // window.location.href = '/cart';
      
      this.emit('checkoutInitiated', state);
      this.close();
    }

    // Public API methods
    getState() {
      return this.state.getState();
    }

    setState(newState) {
      Object.keys(newState).forEach(key => {
        this.state.updatePersonalization(key, newState[key]);
      });
    }

    reset() {
      this.state.reset();
      this.calculatePricing();
      this.switchView('personalize');
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
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
      
      // Remove focus trap
      if (this.focusTrap) {
        this.focusTrap();
      }
      
      this.emit('modalDestroyed');
    }
  }

  // ============================================
  // GLOBAL INITIALIZATION
  // ============================================
  
  // Auto-initialize modals when DOM is ready
  function initializeModals() {
    const modals = document.querySelectorAll('.mini-atc-modal');
    const instances = new Map();

    modals.forEach((modal, index) => {
      const instance = new MiniATCModal(modal);
      instances.set(modal.id, instance);
      
      // Make instance globally accessible
      window[`miniATCModal_${modal.dataset.modalId || modal.id}`] = instance;
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
      }
    };

    return instances;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModals);
  } else {
    initializeModals();
  }

  // Dispatch custom event when modal system is ready
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      if (window.MiniATCModal) {
        document.dispatchEvent(new CustomEvent('miniATCModalReady'));
      }
    }, 100);
  });

  // Global functions for backward compatibility and external triggers
  window.openMiniATCModal = function(modalId) {
    if (window.MiniATCModal) {
      window.MiniATCModal.openModal(modalId);
    }
  };

  window.closeMiniATCModal = function(modalId) {
    if (window.MiniATCModal) {
      window.MiniATCModal.closeModal(modalId);
    }
  };

  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MiniATCModal, PersonalizationState, PricingCalculator };
  }

})();
