/**
 * Storage Manager
 * Handles localStorage operations with error handling
 */

export const StorageManager = {
	/**
	 * Save data to localStorage
	 * @param {string} key - Storage key
	 * @param {any} data - Data to save
	 * @returns {boolean} Success status
	 */
	save(key, data) {
		try {
			localStorage.setItem(key, JSON.stringify(data));
			return true;
		} catch (error) {
			return false;
		}
	},

	/**
	 * Load data from localStorage
	 * @param {string} key - Storage key
	 * @returns {any|null} Parsed data or null
	 */
	load(key) {
		try {
			const data = localStorage.getItem(key);
			return data ? JSON.parse(data) : null;
		} catch (error) {
			return null;
		}
	},

	/**
	 * Remove data from localStorage
	 * @param {string} key - Storage key
	 * @returns {boolean} Success status
	 */
	remove(key) {
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			return false;
		}
	},
};

