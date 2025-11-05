/**
 * ============================================
 * CHUUG UNIFIED COUNTDOWN TIMER SYSTEM
 * ============================================
 * 
 * A unified countdown timer that synchronizes all countdown displays across:
 * - PDP Flash Section (flash-section)
 * - Collection Hero Banner (#countdown-timer)
 * - Mini ATC Modal (mini-atc-countdown-timer)
 * - Any element with class 'chuug-countdown'
 * 
 * Features:
 * - Single source of truth for all countdown timers
 * - Flash sale date/time support with fallback to fixed duration
 * - localStorage persistence across page loads
 * - Automatic synchronization of all timer displays
 * - Support for different display formats
 * 
 * ============================================
 */
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Default duration: 2 hours 7 minutes (fallback when no flash sale)
    DEFAULT_DURATION: 2 * 60 * 60 + 7 * 60, // 2h 7m in seconds
    STORAGE_KEY: 'chuugUnifiedCountdown',
    UPDATE_INTERVAL: 1000, // 1 second
    FLASH_SALE_STORAGE_KEY: 'chuugFlashSaleEndTime'
  };

  // Global state
  let masterTimer = null;
  let isInitialized = false;
  let flashSaleEndTime = null;
  let useFlashSale = false;

  /**
   * Get flash sale end time from global config or localStorage
   * @returns {Date|null} Flash sale end time or null
   */
  function getFlashSaleEndTime() {
    // Priority 1: Check global flash sale configuration
    if (window.chuugFlashSale && window.chuugFlashSale.enabled) {
      const endDate = window.chuugFlashSale.endDate;
      const endTime = window.chuugFlashSale.endTime;
      
      if (endDate && endTime) {
        const flashSaleTime = new Date(`${endDate}T${endTime}`);
        if (!isNaN(flashSaleTime.getTime())) {
          return flashSaleTime;
        }
      }
    }

    // Priority 2: Check localStorage for cached flash sale time
    const cachedTime = localStorage.getItem(CONFIG.FLASH_SALE_STORAGE_KEY);
    if (cachedTime) {
      const parsedTime = new Date(cachedTime);
      if (!isNaN(parsedTime.getTime()) && parsedTime > new Date()) {
        return parsedTime;
      }
    }

    return null;
  }

  /**
   * Get the current countdown time remaining
   * @returns {number} Time remaining in seconds
   */
  function getTimeRemaining() {
    if (useFlashSale && flashSaleEndTime) {
      // Flash sale countdown
      const now = new Date().getTime();
      const distance = flashSaleEndTime.getTime() - now;
      return Math.max(0, Math.floor(distance / 1000));
    } else {
      // Fixed duration countdown
      const savedTime = localStorage.getItem(CONFIG.STORAGE_KEY);
      const currentTime = Math.floor(Date.now() / 1000);

      if (savedTime) {
        const remainingTime = CONFIG.DEFAULT_DURATION - (currentTime - parseInt(savedTime));
        return Math.max(0, remainingTime);
      } else {
        localStorage.setItem(CONFIG.STORAGE_KEY, currentTime.toString());
        return CONFIG.DEFAULT_DURATION;
      }
    }
  }

  /**
   * Format time for different display types
   * @param {number} timeRemaining - Time remaining in seconds
   * @param {string} format - Display format ('HH:MM:SS' or 'separate')
   * @returns {Object} Formatted time object
   */
  function formatTime(timeRemaining, format = 'HH:MM:SS') {
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    if (format === 'separate') {
      return {
        hours: formattedHours,
        minutes: formattedMinutes,
        seconds: formattedSeconds
      };
    } else {
      return {
        formatted: `${formattedHours}:${formattedMinutes}:${formattedSeconds}`,
        hours: formattedHours,
        minutes: formattedMinutes,
        seconds: formattedSeconds
      };
    }
  }

  /**
   * Update a specific countdown element
   * @param {HTMLElement} element - The countdown element to update
   * @param {number} timeRemaining - Time remaining in seconds
   */
  function updateCountdownElement(element, timeRemaining) {
    if (!element) return;

    // Determine display format based on element structure
    const hasSeparateElements = element.querySelector('[data-countdown-hours]') || 
                               element.querySelector('#flash-countdown-hours');
    
    if (hasSeparateElements) {
      // Separate hour/minute/second elements (PDP Flash Section)
      const time = formatTime(timeRemaining, 'separate');
      
      // Try different selector patterns
      const hoursEl = element.querySelector('[data-countdown-hours]') || 
                     element.querySelector('#flash-countdown-hours .flash-timer-number') ||
                     element.querySelector('#flash-countdown-hours');
      const minutesEl = element.querySelector('[data-countdown-minutes]') || 
                       element.querySelector('#flash-countdown-minutes .flash-timer-number') ||
                       element.querySelector('#flash-countdown-minutes');
      const secondsEl = element.querySelector('[data-countdown-seconds]') || 
                        element.querySelector('#flash-countdown-seconds .flash-timer-number') ||
                        element.querySelector('#flash-countdown-seconds');

      if (hoursEl) hoursEl.textContent = time.hours;
      if (minutesEl) minutesEl.textContent = time.minutes;
      if (secondsEl) secondsEl.textContent = time.seconds;
    } else {
      // Single time element (Mini ATC, Collection Banner)
      const time = formatTime(timeRemaining);
      const timeEl = element.querySelector('.countdown-timer__time') || 
                    element.querySelector('#mini-atc-countdown-timer') ||
                    element.querySelector('#countdown-timer') ||
                    element;
      
      if (timeEl) {
        timeEl.textContent = time.formatted;
      }
    }
  }

  /**
   * Update all countdown elements
   * @param {number} timeRemaining - Time remaining in seconds
   */
  function updateAllCountdowns(timeRemaining) {
    // Find all countdown elements
    const selectors = [
      '.chuug-countdown',
      '#countdown-timer',
      '.flash-countdown-timer',
      '.countdown-timer',
      '[data-countdown-section]'
    ];

    const allElements = new Set();
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => allElements.add(el));
    });

    // Update each element
    allElements.forEach(element => {
      updateCountdownElement(element, timeRemaining);
    });
  }

  /**
   * Initialize the unified countdown system
   */
  function initUnifiedCountdown() {
    if (isInitialized) return;

    // Check for flash sale configuration
    flashSaleEndTime = getFlashSaleEndTime();
    useFlashSale = flashSaleEndTime !== null;

    if (useFlashSale) {
      console.log('🎯 Using Flash Sale countdown, ends at:', flashSaleEndTime);
      // Cache the flash sale time
      localStorage.setItem(CONFIG.FLASH_SALE_STORAGE_KEY, flashSaleEndTime.toISOString());
    } else {
      console.log('🎯 Using default countdown duration:', CONFIG.DEFAULT_DURATION, 'seconds');
    }

    // Get initial time remaining
    let timeRemaining = getTimeRemaining();

    // Update all elements immediately
    updateAllCountdowns(timeRemaining);

    // Start the master timer
    masterTimer = setInterval(() => {
      timeRemaining = getTimeRemaining();
      
      if (timeRemaining <= 0) {
        // Timer expired - reset if using default duration
        if (!useFlashSale) {
          localStorage.setItem(CONFIG.STORAGE_KEY, Math.floor(Date.now() / 1000).toString());
          timeRemaining = CONFIG.DEFAULT_DURATION;
        } else {
          // Flash sale expired - show 00:00:00
          updateAllCountdowns(0);
          return;
        }
      }

      updateAllCountdowns(timeRemaining);
    }, CONFIG.UPDATE_INTERVAL);

    isInitialized = true;
    console.log('✅ Chuug Unified Countdown Timer Initialized');
  }

  /**
   * Reinitialize for dynamically added elements
   */
  function reinitCountdown() {
    const timeRemaining = getTimeRemaining();
    updateAllCountdowns(timeRemaining);
  }

  /**
   * Reset the countdown timer
   */
  function resetCountdown() {
    if (useFlashSale) {
      // Clear flash sale cache
      localStorage.removeItem(CONFIG.FLASH_SALE_STORAGE_KEY);
      flashSaleEndTime = getFlashSaleEndTime();
      useFlashSale = flashSaleEndTime !== null;
    } else {
      // Reset default timer
      localStorage.setItem(CONFIG.STORAGE_KEY, Math.floor(Date.now() / 1000).toString());
    }
    reinitCountdown();
  }

  /**
   * Clean up the timer
   */
  function destroyCountdown() {
    if (masterTimer) {
      clearInterval(masterTimer);
      masterTimer = null;
    }
    isInitialized = false;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnifiedCountdown);
  } else {
    initUnifiedCountdown();
  }

  // Handle page visibility changes to pause/resume
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page hidden - pause updates (optional)
    } else {
      // Page visible - refresh countdown
      reinitCountdown();
    }
  });

  // Expose API for manual control
  window.chuugUnifiedCountdown = {
    init: initUnifiedCountdown,
    reinit: reinitCountdown,
    reset: resetCountdown,
    destroy: destroyCountdown,
    getTimeRemaining: getTimeRemaining,
    isFlashSale: () => useFlashSale,
    getFlashSaleEndTime: () => flashSaleEndTime
  };

  // Legacy compatibility - keep old API working
  window.chuugCountdown = {
    init: initUnifiedCountdown,
    reinit: reinitCountdown,
    reset: resetCountdown,
    getTimeRemaining: getTimeRemaining
  };

})();
