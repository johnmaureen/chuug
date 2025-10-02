/**
 * Countdown Timer Component
 * Displays a countdown timer with localStorage persistence
 */

import { StorageManager } from '../core/storage.js';

export class CountdownTimer {
	/**
	 * @param {HTMLElement} element - Timer display element
	 * @param {number} duration - Duration in seconds (default 24 hours)
	 */
	constructor(element, duration = 24 * 60 * 60) {
		this.element = element;
		this.duration = duration;
		this.startTime = this.getStartTime();
		this.timer = null;
		this.init();
	}

	/**
	 * Get or initialize start time from storage
	 * @returns {number} Unix timestamp
	 */
	getStartTime() {
		const storageKey = "chuug_countdown_start";
		let startTime = StorageManager.load(storageKey);

		if (!startTime) {
			startTime = Math.floor(Date.now() / 1000);
			StorageManager.save(storageKey, startTime);
		}

		return startTime;
	}

	/**
	 * Initialize the countdown timer
	 */
	init() {
		this.update();
		this.timer = setInterval(() => this.update(), 1000);
	}

	/**
	 * Update the timer display
	 */
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

	/**
	 * Reset the countdown timer
	 */
	reset() {
		this.startTime = Math.floor(Date.now() / 1000);
		StorageManager.save("chuug_countdown_start", this.startTime);
		if (this.element) {
			this.element.textContent = "24:00:00";
		}
	}

	/**
	 * Clean up the timer
	 */
	destroy() {
		if (this.timer) {
			clearInterval(this.timer);
		}
	}
}

