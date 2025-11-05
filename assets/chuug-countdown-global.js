/**
 * ============================================
 * CHUUG GLOBAL COUNTDOWN TIMER
 * ============================================
 * 
 * A persistent countdown timer that works across the entire site.
 * Syncs across all pages including:
 * - PDP Flash Section
 * - Collection Hero Banner
 * - Mini ATC Modal
 * - Any element with class 'chuug-countdown'
 * 
 * Features:
 * - Fixed duration: 2 hours and 7 minutes
 * - Uses localStorage to persist across page loads
 * - Auto-resets when timer reaches 0
 * - Updates all countdown elements simultaneously
 * 
 * ============================================
 */
(function() {
  // Set the countdown time (2 hours 7 minutes) in seconds
  const COUNTDOWN_DURATION = 2 * 60 * 60 + 7 * 60;
  const STORAGE_KEY = 'chuugCountdownTimer';

  /**
   * Get the remaining time for the countdown
   * @returns {number} Remaining time in seconds
   */
  function getTimeRemaining() {
    const savedTime = localStorage.getItem(STORAGE_KEY);
    const currentTime = Math.floor(Date.now() / 1000);

    if (savedTime) {
      const remainingTime = COUNTDOWN_DURATION - (currentTime - savedTime);
      return remainingTime > 0 ? remainingTime : 0;
    } else {
      localStorage.setItem(STORAGE_KEY, currentTime);
      return COUNTDOWN_DURATION;
    }
  }

  /**
   * Update the countdown display
   * @param {HTMLElement} container - The countdown container element
   * @param {number} timeRemaining - Time remaining in seconds
   */
  function updateCountdown(container, timeRemaining) {
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    // Format with zero-padding
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    // Try different selector patterns for different implementations
    const hoursEl = container.querySelector('[data-countdown-hours]') || container.querySelector('#hours');
    const minutesEl = container.querySelector('[data-countdown-minutes]') || container.querySelector('#minutes');
    const secondsEl = container.querySelector('[data-countdown-seconds]') || container.querySelector('#seconds');

    if (hoursEl) hoursEl.textContent = formattedHours;
    if (minutesEl) minutesEl.textContent = formattedMinutes;
    if (secondsEl) secondsEl.textContent = formattedSeconds;
  }

  /**
   * Initialize the countdown timer
   */
  function initCountdown() {
    // Find all countdown elements
    const countdownElements = document.querySelectorAll('.chuug-countdown, #countdown-timer');
    if (countdownElements.length === 0) return;

    let timeRemaining = getTimeRemaining();

    // Update all countdown elements immediately
    countdownElements.forEach(el => updateCountdown(el, timeRemaining));

    // Start the interval
    const intervalId = setInterval(function() {
      if (timeRemaining > 0) {
        timeRemaining--;
        countdownElements.forEach(el => updateCountdown(el, timeRemaining));
      } else {
        // Reset timer when it reaches 0
        timeRemaining = COUNTDOWN_DURATION;
        localStorage.setItem(STORAGE_KEY, Math.floor(Date.now() / 1000));
      }
    }, 1000);

    // Store interval ID for potential cleanup
    window.chuugCountdownInterval = intervalId;
  }

  /**
   * Reinitialize countdown for dynamically added elements
   */
  function reinitCountdown() {
    const countdownElements = document.querySelectorAll('.chuug-countdown, #countdown-timer');
    if (countdownElements.length === 0) return;

    const timeRemaining = getTimeRemaining();
    countdownElements.forEach(el => updateCountdown(el, timeRemaining));
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountdown);
  } else {
    initCountdown();
  }

  // Expose API for manual initialization and utilities
  window.chuugCountdown = {
    init: initCountdown,
    reinit: reinitCountdown,
    reset: function() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, Math.floor(Date.now() / 1000));
      reinitCountdown();
    },
    getTimeRemaining: getTimeRemaining
  };

  console.log('✅ Chuug Global Countdown Timer Initialized');
})();

