/**
 * Personalization State Manager
 * Manages personalization options and vessel selections
 */

import { EventEmitter } from '../core/event-emitter.js';
import { StorageManager } from '../core/storage.js';
import { Utils } from '../core/utils.js';
import { CONFIG } from '../core/config.js';

export class PersonalizationState extends EventEmitter {
	constructor() {
		super();
		this.state = {
			engraving: {
				enabled: true,
				vessels: {},
			},
			mixMatch: {
				enabled: true,
				variants: {},
			},
			extraCups: {
				enabled: false,
				variants: {},
			},
			giftBox: {
				enabled: false,
			},
		};
		this.loadState();
	}

	/**
	 * Load state from localStorage (selective restore)
	 */
	loadState() {
		const saved = StorageManager.load(CONFIG.STORAGE_KEY);
		if (saved) {
			// Only restore engraving and mixMatch states
			if (saved.engraving) {
				this.state.engraving = {
					...this.state.engraving,
					...saved.engraving,
				};
			}
			if (saved.mixMatch) {
				this.state.mixMatch = { ...this.state.mixMatch, ...saved.mixMatch };
			}
			console.log("💾 Loaded state (selective):", {
				restored: {
					engraving: saved.engraving || null,
					mixMatch: saved.mixMatch || null,
				},
				keptAtDefaults: {
					giftBox: this.state.giftBox,
					extraCups: this.state.extraCups,
				},
			});
		}
	}

	/**
	 * Save state to localStorage (selective persist)
	 */
	saveState() {
		const stateToPersist = {
			engraving: this.state.engraving,
			mixMatch: this.state.mixMatch,
		};
		StorageManager.save(CONFIG.STORAGE_KEY, stateToPersist);
	}

	/**
	 * Update personalization settings
	 * @param {string} type - Personalization type
	 * @param {Object} data - Updated data
	 */
	updatePersonalization(type, data) {
		this.state[type] = { ...this.state[type], ...data };
		this.saveState();
		this.emit("personalizationChanged", { type, data: this.state[type] });
	}

	/**
	 * Update variant quantity
	 * @param {string} type - Personalization type
	 * @param {string} variantId - Variant ID
	 * @param {number} quantity - New quantity
	 */
	updateVariantQuantity(type, variantId, quantity) {
		if (!this.state[type].variants) {
			this.state[type].variants = {};
		}

		this.state[type].variants[variantId] = Math.max(0, quantity);
		this.saveState();
		this.emit("variantChanged", { type, variantId, quantity });
	}

	/**
	 * Update vessel engraving text
	 * @param {string} vesselId - Vessel identifier
	 * @param {string} text - Engraving text
	 */
	updateVesselEngraving(vesselId, text) {
		if (!this.state.engraving.vessels) {
			this.state.engraving.vessels = {};
		}
		this.state.engraving.vessels[vesselId] = Utils.sanitizeInput(text);
		this.saveState();
		this.emit("vesselChanged", {
			vesselId,
			text: this.state.engraving.vessels[vesselId],
		});
	}

	/**
	 * Get current state
	 * @returns {Object} Current state
	 */
	getState() {
		return { ...this.state };
	}

	/**
	 * Reset engraving state
	 */
	resetEngraving() {
		this.state.engraving = {
			enabled: true,
			vessels: {},
		};
		this.saveState();

		const verification = StorageManager.load(CONFIG.STORAGE_KEY);
		console.log("🔄 Engraving state reset - verification:", {
			engravingVessels: verification?.engraving?.vessels,
			shouldBeEmpty:
				Object.keys(verification?.engraving?.vessels || {}).length === 0,
		});

		this.emit("engravingReset");
	}

	/**
	 * Reset all state
	 */
	reset() {
		this.state = {
			engraving: { enabled: true, vessels: {} },
			mixMatch: { enabled: true, variants: {} },
			extraCups: { enabled: false, variants: {} },
			giftBox: { enabled: false },
		};
		StorageManager.remove(CONFIG.STORAGE_KEY);
		this.emit("stateReset");
	}
}

