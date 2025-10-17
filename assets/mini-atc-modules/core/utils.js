/**
 * Shared Utility Functions
 * Reusable helper methods for the entire application
 */

export const Utils = {
	/**
	 * Debounce function calls to improve performance
	 * @param {Function} func - Function to debounce
	 * @param {number} delay - Delay in milliseconds
	 * @returns {Function} Debounced function
	 */
	debounce(func, delay) {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
		};
	},

	/**
	 * Generate a unique ID
	 * @returns {string} Random ID string
	 */
	generateId() {
		return Math.random().toString(36).substr(2, 9);
	},

	/**
	 * Format price from cents to currency string
	 * @param {number} cents - Price in cents
	 * @returns {string} Formatted price string
	 */
	formatPrice(cents) {
		return `£${(cents / 100).toFixed(2)}`;
	},

	/**
	 * Sanitize user input for engraving (letters only, max 3 chars)
	 * @param {string} input - Raw user input
	 * @returns {string} Sanitized input
	 */
	sanitizeInput(input) {
		return input
			.replace(/[^A-Za-z]/g, "")
			.toUpperCase()
			.slice(0, 3);
	},

	/**
	 * Trap focus within a modal for accessibility
	 * @param {HTMLElement} element - Modal element
	 * @returns {Function} Cleanup function
	 */
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

