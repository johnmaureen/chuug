/**
 * Countdown Timer Component - DEPRECATED
 * 
 * This component is deprecated. Countdown timer functionality
 * is now handled by chuug-unified-countdown.js to ensure
 * synchronization across all countdown displays.
 * 
 * @deprecated Use chuug-unified-countdown.js instead
 */

import { StorageManager } from '../core/storage.js';

export class CountdownTimer {
	/**
	 * @deprecated Use chuug-unified-countdown.js instead
	 * @param {HTMLElement} element - Timer display element
	 * @param {number} duration - Duration in seconds (default 24 hours)
	 */
	constructor(element, duration = 24 * 60 * 60) {
		console.warn('⚠️ CountdownTimer is deprecated. Use chuug-unified-countdown.js for synchronized timers.');
		
		// Redirect to unified countdown system
		if (window.chuugUnifiedCountdown) {
			window.chuugUnifiedCountdown.reinit();
		}
	}

	/**
	 * @deprecated
	 */
	getStartTime() {
		return Math.floor(Date.now() / 1000);
	}

	/**
	 * @deprecated
	 */
	init() {
		// No-op - handled by unified system
	}

	/**
	 * @deprecated
	 */
	update() {
		// No-op - handled by unified system
	}

	/**
	 * @deprecated
	 */
	reset() {
		if (window.chuugUnifiedCountdown) {
			window.chuugUnifiedCountdown.reset();
		}
	}

	/**
	 * @deprecated
	 */
	destroy() {
		// No-op - handled by unified system
	}
}

