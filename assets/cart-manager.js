/**
 * Centralized Cart Management System
 * Handles all cart operations including adding, removing, and updating items
 */

class CartManager {
  constructor() {
    this.isLoading = false;
    this.debounceTimer = null;
    this.init();
  }

  init() {
    // Initialize event listeners for cart updates
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for cart update events from other components
    document.addEventListener('cart:updated', this.handleCartUpdate.bind(this));
  }

  /**
   * Remove an item from the cart by ID
   * @param {string|number} itemId - The cart item ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Cart data after removal
   */
  async removeItem(itemId, options = {}) {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showLoadingState(itemId);

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: itemId,
          quantity: 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartData = await response.json();
      
      // Dispatch custom event for cart update
      this.dispatchCartUpdate(cartData);
      
      // Show success feedback
      this.showSuccessFeedback(itemId);
      
      // Reload page if specified in options or if no custom handler
      if (options.reload !== false) {
        setTimeout(() => {
          window.location.reload();
        }, options.reloadDelay || 500);
      }

      return cartData;

    } catch (error) {
      this.showErrorFeedback(itemId, error);
      throw error;
    } finally {
      this.isLoading = false;
      this.hideLoadingState(itemId);
    }
  }

  /**
   * Update item quantity in cart
   * @param {string|number} itemId - The cart item ID
   * @param {number} quantity - New quantity
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Cart data after update
   */
  async updateQuantity(itemId, quantity, options = {}) {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showLoadingState(itemId);

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: itemId,
          quantity: Math.max(0, quantity) // Ensure quantity is not negative
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartData = await response.json();
      
      // Dispatch custom event for cart update
      this.dispatchCartUpdate(cartData);
      
      return cartData;

    } catch (error) {
      this.showErrorFeedback(itemId, error);
      throw error;
    } finally {
      this.isLoading = false;
      this.hideLoadingState(itemId);
    }
  }

  /**
   * Add item to cart
   * @param {Object} itemData - Item data to add
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Cart data after addition
   */
  async addItem(itemData, options = {}) {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartData = await response.json();
      
      // Dispatch custom event for cart update
      this.dispatchCartUpdate(cartData);
      
      return cartData;

    } catch (error) {
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Clear entire cart
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Cart data after clearing
   */
  async clearCart(options = {}) {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartData = await response.json();
      
      // Dispatch custom event for cart update
      this.dispatchCartUpdate(cartData);
      
      return cartData;

    } catch (error) {
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get current cart data
   * @returns {Promise<Object>} - Current cart data
   */
  async getCart() {
    try {
      const response = await fetch('/cart.js', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartData = await response.json();

      return cartData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Show loading state for specific item
   * @param {string|number} itemId - The cart item ID
   */
  showLoadingState(itemId) {
    const itemElement = this.getItemElement(itemId);
    if (itemElement) {
      itemElement.classList.add('checkout-products-wrap--loading');
      
      // Disable all buttons in the item
      const buttons = itemElement.querySelectorAll('button');
      buttons.forEach(button => button.disabled = true);
    }
  }

  /**
   * Hide loading state for specific item
   * @param {string|number} itemId - The cart item ID
   */
  hideLoadingState(itemId) {
    const itemElement = this.getItemElement(itemId);
    if (itemElement) {
      itemElement.classList.remove('checkout-products-wrap--loading');
      
      // Re-enable all buttons in the item
      const buttons = itemElement.querySelectorAll('button');
      buttons.forEach(button => button.disabled = false);
    }
  }

  /**
   * Show success feedback
   * @param {string|number} itemId - The cart item ID
   */
  showSuccessFeedback(itemId) {
    const itemElement = this.getItemElement(itemId);
    if (itemElement) {
      // Add success class for styling
      itemElement.classList.add('checkout-products-wrap--success');
      
      // Remove success class after animation
      setTimeout(() => {
        itemElement.classList.remove('checkout-products-wrap--success');
      }, 2000);
    }
  }

  /**
   * Show error feedback
   * @param {string|number} itemId - The cart item ID
   * @param {Error} error - The error object
   */
  showErrorFeedback(itemId, error) {
    const itemElement = this.getItemElement(itemId);
    if (itemElement) {
      // Add error class for styling
      itemElement.classList.add('checkout-products-wrap--error');
      
      // Remove error class after animation
      setTimeout(() => {
        itemElement.classList.remove('checkout-products-wrap--error');
      }, 3000);
    }

    // Show user-friendly error message
    this.showNotification('Error updating cart. Please try again.', 'error');
  }

  /**
   * Get DOM element for cart item
   * @param {string|number} itemId - The cart item ID
   * @returns {HTMLElement|null} - The item element
   */
  getItemElement(itemId) {
    // Try different selectors to find the item element
    const selectors = [
      `[data-item-id="${itemId}"]`,
      `[data-cart-item-id="${itemId}"]`,
      `.checkout-products-wrap[data-item-id="${itemId}"]`,
      `.cart-item[data-item-id="${itemId}"]`
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  /**
   * Dispatch cart update event
   * @param {Object} cartData - Updated cart data
   */
  dispatchCartUpdate(cartData) {
    const event = new CustomEvent('cart:updated', {
      detail: { cartData },
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Handle cart update events
   * @param {CustomEvent} event - Cart update event
   */
  handleCartUpdate(event) {
    // Update cart counters, totals, etc.
    this.updateCartUI(event.detail.cartData);
  }

  /**
   * Update cart UI elements
   * @param {Object} cartData - Cart data
   */
  updateCartUI(cartData) {
    // Update cart count
    const cartCountElements = document.querySelectorAll('.cart-count, [data-cart-count]');
    cartCountElements.forEach(element => {
      element.textContent = cartData.item_count || 0;
    });

    // Update cart total
    const cartTotalElements = document.querySelectorAll('.cart-total, [data-cart-total]');
    cartTotalElements.forEach(element => {
      element.textContent = this.formatMoney(cartData.total_price);
    });
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification--${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after delay
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Format money value with dynamic currency support
   * @param {number} cents - Money value in cents
   * @returns {string} - Formatted money string
   */
  formatMoney(cents) {
    // Use CurrencyManager if available (preferred method)
    if (window.CurrencyManager) {
      return window.CurrencyManager.formatPrice(cents);
    }

    // Format cents to money string with proper currency symbol
    const amount = (cents / 100).toFixed(2);
    
    // Try to detect currency with multiple fallbacks
    let currency = 'GBP'; // Default fallback
    
    if (window.CURRENT_CURRENCY) {
      currency = window.CURRENT_CURRENCY;
    } else if (window.Shopify?.currency?.active) {
      currency = window.Shopify.currency.active;
    } else if (window.Shopify?.shop?.currency) {
      currency = window.Shopify.shop.currency;
    }

    // Expanded currency symbol mapping (matching pomc-system.js and CurrencyManager)
    const currencySymbols = {
      USD: "$",
      GBP: "£",
      EUR: "€",
      CAD: "$",
      AUD: "$",
      JPY: "¥",
      CHF: "CHF",
      SEK: "kr",
      DKK: "kr.",
      NOK: "kr",
      PLN: "zł",
      CZK: "Kč",
      HUF: "Ft",
      RON: "Lei",
      BGN: "лв.",
      HRK: "kn",
      RSD: "дин.",
      TRY: "₺",
      RUB: "₽",
      UAH: "₴",
      ILS: "₪",
      AED: "د.إ",
      SAR: "﷼",
      QAR: "﷼",
      KWD: "د.ك",
      BHD: "د.ب",
      OMR: "﷼",
      JOD: "د.ا",
      EGP: "£",
      ZAR: "R",
      NGN: "₦",
      KES: "KSh",
      KRW: "₩",
      THB: "฿",
      VND: "₫",
      IDR: "Rp",
      MYR: "RM",
      SGD: "$",
      PHP: "₱",
      INR: "₹",
      PKR: "₨",
      NZD: "$",
      BRL: "R$",
      MXN: "$",
      DEFAULT: "£" // Default to £ for other currencies
    };

    const symbol = currencySymbols[currency] || currencySymbols.DEFAULT;
    return `${symbol}${amount}`;
  }
}

// Initialize cart manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.cartManager = new CartManager();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    window.cartManager = new CartManager();
  });
} else {
  window.cartManager = new CartManager();
}
