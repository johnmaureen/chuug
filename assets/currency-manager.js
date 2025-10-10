/**
 * Currency Manager for Dynamic Pricing
 * Handles currency detection, formatting, and product price fetching via GraphQL
 */

class CurrencyManager {
  constructor() {
    this.currentCurrency = this.getCurrentCurrency();
    this.currencySymbols = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'CAD': '$',
      'AUD': '$',
      'JPY': '¥',
      'CHF': 'CHF',
      'SEK': 'kr',
      'DKK': 'kr.',
      'NOK': 'kr',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'RON': 'Lei',
      'BGN': 'лв.',
      'HRK': 'kn',
      'RSD': 'дин.',
      'TRY': '₺',
      'RUB': '₽',
      'UAH': '₴',
      'ILS': '₪',
      'AED': 'د.إ',
      'SAR': '﷼',
      'QAR': '﷼',
      'KWD': 'د.ك',
      'BHD': 'د.ب',
      'OMR': '﷼',
      'JOD': 'د.ا',
      'EGP': '£',
      'LBP': 'ل.ل',
      'MAD': 'د.م.',
      'TND': 'د.ت',
      'DZD': 'د.ج',
      'ZAR': 'R',
      'NGN': '₦',
      'KES': 'KSh',
      'UGX': 'USh',
      'TZS': 'TSh',
      'ETB': 'Br',
      'GHS': '₵',
      'XOF': 'CFA',
      'XAF': 'FCFA',
      'MAD': 'د.م.',
      'KRW': '₩',
      'THB': '฿',
      'VND': '₫',
      'IDR': 'Rp',
      'MYR': 'RM',
      'SGD': '$',
      'PHP': '₱',
      'INR': '₹',
      'PKR': '₨',
      'BDT': '৳',
      'LKR': '₨',
      'NPR': '₨',
      'MMK': 'K',
      'KHR': '៛',
      'LAK': '₭',
      'BND': '$',
      'FJD': '$',
      'PGK': 'K',
      'SBD': '$',
      'TOP': 'T$',
      'VUV': 'Vt',
      'WST': 'WS$',
      'XPF': '₣',
      'NZD': '$',
      'BRL': 'R$',
      'ARS': '$',
      'CLP': '$',
      'COP': '$',
      'MXN': '$',
      'PEN': 'S/',
      'UYU': '$',
      'VEF': 'Bs',
      'BOB': 'Bs',
      'PYG': '₲',
      'CRC': '₡',
      'GTQ': 'Q',
      'HNL': 'L',
      'NIO': 'C$',
      'PAB': 'B/.',
      'DOP': '$',
      'JMD': '$',
      'TTD': 'TT$',
      'BBD': '$',
      'XCD': '$',
      'AWG': 'ƒ',
      'BZD': '$',
      'GYD': '$',
      'SRD': '$',
      'KYD': '$',
      'BSD': '$'
    };
    
    this.init();
  }

  /**
   * Initialize the currency manager
   */
  init() {
    this.setupCurrencyChangeListener();
    this.dispatchCurrencyChangeEvent();
    
    // Fetch initial gift box pricing
    setTimeout(() => {
      this.fetchGiftBoxPricing().catch(error => {
        console.warn('Could not fetch initial gift box pricing:', error);
      });
    }, 1000);
  }

  /**
   * Get current currency from Shopify
   */
  getCurrentCurrency() {
    // Try to get from POMC system first (most reliable)
    if (window.CURRENT_CURRENCY) {
      return window.CURRENT_CURRENCY;
    }
    
    // Try to get from cart currency
    if (window.Shopify?.currency?.active) {
      return window.Shopify.currency.active;
    }
    
    // Fallback to shop currency
    if (window.Shopify?.shop?.currency) {
      return window.Shopify.shop.currency;
    }
    
    // Fallback to GBP as default
    return 'GBP';
  }

  /**
   * Get currency symbol for a given currency code
   */
  getCurrencySymbol(currencyCode = null) {
    const currency = currencyCode || this.currentCurrency;
    return this.currencySymbols[currency] || currency;
  }

  /**
   * Format price with current currency
   */
  formatPrice(amount, currencyCode = null) {
    const currency = currencyCode || this.currentCurrency;
    const symbol = this.getCurrencySymbol(currency);
    const formattedAmount = (parseFloat(amount) / 100).toFixed(2);
    return `${symbol}${formattedAmount}`;
  }

  /**
   * Setup listener for currency changes
   */
  setupCurrencyChangeListener() {
    // Listen for localization form submissions (country/currency changes)
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.classList.contains('localization-form')) {
        // Currency change detected, wait for page reload or update
        setTimeout(() => {
          this.handleCurrencyChange();
        }, 1000);
      }
    });

    // Listen for programmatic currency changes
    document.addEventListener('currencyChanged', () => {
      this.handleCurrencyChange();
    });

    // Check for currency changes on page load
    window.addEventListener('load', () => {
      this.checkForCurrencyChange();
    });
  }

  /**
   * Handle currency change
   */
  async handleCurrencyChange() {
    const newCurrency = this.getCurrentCurrency();
    
    if (newCurrency !== this.currentCurrency) {
      console.log(`🔄 Currency changed from ${this.currentCurrency} to ${newCurrency}`);
      
      this.currentCurrency = newCurrency;
      
      // Dispatch custom event for other components to listen to
      document.dispatchEvent(new CustomEvent('currencyUpdated', {
        detail: {
          currency: this.currentCurrency,
          symbol: this.getCurrencySymbol()
        }
      }));
      
      // Update any existing price displays
      this.updateExistingPriceDisplays();
      
      // Fetch updated gift box pricing
      try {
        await this.fetchGiftBoxPricing();
      } catch (error) {
        console.warn('Could not update gift box pricing:', error);
      }
    }
  }

  /**
   * Check for currency changes (useful for AJAX-based currency switching)
   */
  async checkForCurrencyChange() {
    try {
      // Fetch current cart to check currency
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      if (cart.currency && cart.currency !== this.currentCurrency) {
        this.currentCurrency = cart.currency;
        this.dispatchCurrencyChangeEvent();
      }
    } catch (error) {
      console.warn('Could not check for currency changes:', error);
    }
  }

  /**
   * Dispatch currency change event
   */
  dispatchCurrencyChangeEvent() {
    document.dispatchEvent(new CustomEvent('currencyUpdated', {
      detail: {
        currency: this.currentCurrency,
        symbol: this.getCurrencySymbol()
      }
    }));
  }

  /**
   * Update existing price displays with new currency
   */
  updateExistingPriceDisplays() {
    // Update elements with data-price attributes
    document.querySelectorAll('[data-price]').forEach(element => {
      const amount = element.getAttribute('data-price');
      if (amount) {
        element.textContent = this.formatPrice(amount);
      }
    });

    // Update elements with data-current-price attributes
    document.querySelectorAll('[data-current-price]').forEach(element => {
      const amount = element.getAttribute('data-current-price');
      if (amount) {
        element.textContent = this.formatPrice(amount);
      }
    });

    // Update pricing placeholders
    document.querySelectorAll('.pricing-placeholder').forEach(element => {
      const amount = element.getAttribute('data-amount') || element.textContent.replace(/[^\d.]/g, '');
      if (amount) {
        element.textContent = this.formatPrice(parseFloat(amount) * 100);
      }
    });

    // Update gift box prices specifically
    document.querySelectorAll('[data-gift-box-price]').forEach(element => {
      const amount = element.getAttribute('data-price');
      if (amount) {
        element.textContent = this.formatPrice(amount);
      }
    });

    // Update premium gift box prices
    document.querySelectorAll('.premium-gift-box__price').forEach(element => {
      const amount = element.getAttribute('data-price');
      if (amount) {
        element.textContent = this.formatPrice(amount);
      }
    });

    // Update currency text elements with template and amount
    document.querySelectorAll('[data-currency-text][data-amount]').forEach(element => {
      const template = element.getAttribute('data-currency-text');
      const amount = element.getAttribute('data-amount');
      if (template && amount) {
        const formattedAmount = this.formatPrice(amount);
        const updatedText = template.replace('{amount}', formattedAmount);
        element.textContent = updatedText;
      }
    });
  }

  /**
   * Fetch product data via GraphQL with current currency
   */
  async fetchProductData(productId) {
    try {
      const globalId = `gid://shopify/Product/${productId}`;
      
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
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
                  compareAtPrice {
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
          "X-Shopify-Storefront-Access-Token": window.Shopify?.storefrontAccessToken || "",
        },
        body: JSON.stringify({
          query: query,
          variables: { id: globalId },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data?.product || null;
    } catch (error) {
      console.error('Failed to fetch product data via GraphQL:', error);
      return null;
    }
  }

  /**
   * Fetch multiple products at once
   */
  async fetchMultipleProducts(productIds) {
    const promises = productIds.map(id => this.fetchProductData(id));
    const results = await Promise.all(promises);
    
    // Filter out null results and create a lookup object
    const productMap = {};
    results.forEach((product, index) => {
      if (product) {
        const originalId = productIds[index];
        productMap[originalId] = product;
      }
    });
    
    return productMap;
  }

  /**
   * Fetch gift box pricing via GraphQL with current currency
   */
  async fetchGiftBoxPricing() {
    try {
      const giftBoxHandle = 'premium-gift-box-tissue-wrap';
      const globalId = `gid://shopify/Product/${giftBoxHandle}`;
      
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
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
          "X-Shopify-Storefront-Access-Token": window.Shopify?.storefrontAccessToken || "",
        },
        body: JSON.stringify({
          query: query,
          variables: { id: globalId },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const product = data.data?.product;
      if (product && product.variants && product.variants.edges.length > 0) {
        const variant = product.variants.edges[0].node;
        const priceInCents = Math.round(parseFloat(variant.price.amount) * 100);
        
        console.log(`🎁 Gift box price fetched via GraphQL: ${variant.price.currencyCode} ${variant.price.amount} (${priceInCents} cents)`);
        
        // Update gift box price displays
        this.updateGiftBoxPriceDisplays(priceInCents);
        
        return priceInCents;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch gift box pricing via GraphQL:', error);
      return null;
    }
  }

  /**
   * Update gift box price displays
   */
  updateGiftBoxPriceDisplays(priceInCents) {
    document.querySelectorAll('[data-gift-box-price]').forEach(element => {
      element.textContent = this.formatPrice(priceInCents);
      element.setAttribute('data-price', priceInCents);
    });

    document.querySelectorAll('.premium-gift-box__price').forEach(element => {
      element.textContent = this.formatPrice(priceInCents);
      element.setAttribute('data-price', priceInCents);
    });

    // Update currency text elements
    document.querySelectorAll('[data-currency-text][data-amount]').forEach(element => {
      const template = element.getAttribute('data-currency-text');
      const amount = element.getAttribute('data-amount');
      if (template && amount) {
        const formattedAmount = this.formatPrice(amount);
        const updatedText = template.replace('{amount}', formattedAmount);
        element.textContent = updatedText;
      }
    });
  }

  /**
   * Get current currency info
   */
  getCurrentCurrencyInfo() {
    return {
      currency: this.currentCurrency,
      symbol: this.getCurrencySymbol(),
      formatPrice: (amount) => this.formatPrice(amount)
    };
  }
}

// Initialize global currency manager
window.CurrencyManager = new CurrencyManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CurrencyManager;
}
