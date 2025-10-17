/**
 * Pricing Calculator Component
 * Calculates total pricing for vessels, engravings, and add-ons
 */

import { EventEmitter } from '../core/event-emitter.js';
import { Utils } from '../core/utils.js';

export class PricingCalculator extends EventEmitter {
	/**
	 * @param {Object} modalInstance - Reference to modal instance for engraving state
	 */
	constructor(modalInstance) {
		super();
		this.modalInstance = modalInstance;
		this.dynamicPrices = {
			vessel: null,
			giftBox: null,
		};
	}

	/**
	 * Calculate total price based on current state
	 * @param {Object} state - Current personalization state
	 * @returns {Object} Pricing breakdown
	 */
	calculateTotal(state) {
		let total = 0;
		let originalTotal = 0;
		let vesselOnlyTotal = 0;
		let vesselOnlyOriginal = 0;

		// Get pricing from POMC system (source of truth)
		const vesselPricing = this.getVesselPricingForMultiplier();
		if (vesselPricing) {
			vesselOnlyTotal = vesselPricing.price;
			vesselOnlyOriginal = vesselPricing.originalPrice;
			total = vesselPricing.price;
			originalTotal = vesselPricing.originalPrice;
		} else {
			console.warn("No vessel pricing data available from POMC system");
			return { total: 0, originalPrice: 0, savings: 0 };
		}

		// Add gift box pricing (multiplied by number of vessels)
		if (state.giftBox?.enabled) {
			const giftBoxPrice = this.dynamicPrices.giftBox || 200; // Default £2.00
			const multiplier = window.pomcSystem?.getMultiplier() || 2;
			const giftBoxTotal = giftBoxPrice * multiplier;
			
			total += giftBoxTotal;
			originalTotal += giftBoxTotal;
			
			console.log("🎁 Gift box pricing added:", {
				pricePerBox: giftBoxPrice,
				multiplier,
				total: giftBoxTotal
			});
		}

		// Add mix & match variants
		if (state.mixMatch?.enabled && state.mixMatch.variants) {
			Object.values(state.mixMatch.variants).forEach((quantity) => {
				const variantPrice = quantity * 1299; // £12.99 fallback
				total += variantPrice;
			});
		}

		// Add extra cups variants
		if (state.extraCups?.enabled && state.extraCups.variants) {
			Object.values(state.extraCups.variants).forEach((quantity) => {
				const variantPrice = quantity * 1299; // £12.99 fallback
				total += variantPrice;
			});
		}

		// Calculate savings (vessel only, not add-ons)
		const vesselSavings = vesselOnlyOriginal - vesselOnlyTotal;

		const pricingData = {
			total,
			originalPrice: originalTotal,
			savings: vesselSavings,
			formattedTotal: Utils.formatPrice(total),
			formattedOriginal: Utils.formatPrice(originalTotal),
			formattedSavings: Utils.formatPrice(vesselSavings),
		};

		this.emit("priceCalculated", pricingData);
		return pricingData;
	}

	/**
	 * Get vessel pricing from POMC system based on multiplier
	 * @returns {Object|null} Pricing data or null
	 */
	getVesselPricingForMultiplier() {
		if (window.pomcSystem) {
			const selectedProductAmountData =
				window.pomcSystem.getSelectedProductAmountData();
			
			if (selectedProductAmountData && selectedProductAmountData.variants) {
				const engravingEnabled = this.getEngravingState();
				const variantIndex = engravingEnabled ? 1 : 0;
				const variant = selectedProductAmountData.variants[variantIndex];

				if (variant) {
					this.dynamicPrices.vessel = {
						price: variant.price,
						originalPrice: variant.compare_at_price,
					};

					return {
						price: variant.price,
						originalPrice: variant.compare_at_price,
					};
				}
			}
		}

		return null;
	}

	/**
	 * Update gift box price
	 * @param {number} priceInCents - Price in cents
	 */
	updateGiftBoxPrice(priceInCents) {
		this.dynamicPrices.giftBox = priceInCents;
	}

	/**
	 * Get engraving enabled state from modal instance
	 * @returns {boolean} Engraving state
	 */
	getEngravingState() {
		if (!this.modalInstance) {
			return false;
		}
		return this.modalInstance.isEngravingEnabled();
	}
}

