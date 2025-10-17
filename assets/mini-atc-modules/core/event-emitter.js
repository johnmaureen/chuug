/**
 * Event Emitter
 * Simple event system for component communication
 */

export class EventEmitter {
	constructor() {
		this.events = {};
	}

	/**
	 * Subscribe to an event
	 * @param {string} event - Event name
	 * @param {Function} callback - Event handler
	 */
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}

	/**
	 * Emit an event
	 * @param {string} event - Event name
	 * @param {any} data - Event data
	 */
	emit(event, data) {
		if (this.events[event]) {
			this.events[event].forEach((callback) => callback(data));
		}
	}

	/**
	 * Unsubscribe from an event
	 * @param {string} event - Event name
	 * @param {Function} callback - Event handler to remove
	 */
	off(event, callback) {
		if (this.events[event]) {
			this.events[event] = this.events[event].filter((cb) => cb !== callback);
		}
	}
}

