/**
 * Product Image Swiper Component
 * Handles product image galleries with Swiper integration
 */

import { CONFIG } from '../core/config.js';

export class ProductImageSwiper {
	/**
	 * @param {HTMLElement} container - Swiper container element
	 * @param {Object} config - Custom Swiper configuration
	 */
	constructor(container, config) {
		this.container = container;
		this.config = { ...CONFIG.SWIPER_CONFIG, ...config };
		this.swiper = null;
		this.init();
	}

	/**
	 * Initialize the swiper
	 */
	init() {
		if (typeof Swiper !== "undefined") {
			this.createSwiper();
		} else {
			// Fallback for manual dot navigation
			this.setupFallbackNavigation();
		}
	}

	/**
	 * Create Swiper instance with configuration
	 */
	createSwiper() {
		const paginationEl = this.container.parentElement.querySelector(
			".mini-atc-modal__image-dots"
		);

		this.swiper = new Swiper(this.container, {
			...this.config,
			pagination: {
				el: paginationEl,
				clickable: true,
				bulletClass: "dot",
				bulletActiveClass: "active",
				renderBullet: (index, className) =>
					`<button class="${className}" aria-label="View product image ${
						index + 1
					}" data-slide="${index}"></button>`,
			},
			on: {
				slideChange: () => {
					this.updateDots();
				},
				init: () => {
					this.updateDots();
					this.setupDotNavigation();
				}
			}
		});
	}

	/**
	 * Setup fallback navigation without Swiper
	 */
	setupFallbackNavigation() {
		const dots = this.container.parentElement.querySelectorAll(".dot");
		const slides = this.container.querySelectorAll(".swiper-slide");

		if (!dots.length || !slides.length) return;

		dots.forEach((dot, index) => {
			dot.addEventListener("click", () => {
				this.goToSlide(index);
			});
		});
	}

	/**
	 * Setup dot navigation controls
	 */
	setupDotNavigation() {
		const dots = this.container.parentElement.querySelectorAll(".dot");
		
		// Clone dots to remove existing event listeners
		dots.forEach((dot) => {
			dot.replaceWith(dot.cloneNode(true));
		});

		// Re-select and attach new listeners
		const newDots = this.container.parentElement.querySelectorAll(".dot");
		newDots.forEach((dot, index) => {
			dot.addEventListener("click", () => {
				this.goToSlide(index);
			});
		});
	}

	/**
	 * Navigate to specific slide
	 * @param {number} index - Slide index
	 */
	goToSlide(index) {
		const slides = this.container.querySelectorAll(".swiper-slide");
		const dots = this.container.parentElement.querySelectorAll(".dot");

		if (this.swiper) {
			this.swiper.slideTo(index);
		} else {
			// Fallback manual slide management
			slides.forEach((slide, i) => {
				slide.style.display = i === index ? "flex" : "none";
			});

			dots.forEach((dot, i) => {
				dot.classList.toggle("active", i === index);
			});
		}
	}

	/**
	 * Update dot indicators
	 */
	updateDots() {
		const dots = this.container.parentElement.querySelectorAll(".dot");
		const activeIndex = this.swiper ? this.swiper.activeIndex : 0;

		dots.forEach((dot, index) => {
			dot.classList.toggle("active", index === activeIndex);
		});
	}

	/**
	 * Update product image
	 * @param {string} imageSrc - Image source URL
	 * @param {string} altText - Image alt text
	 */
	updateProductImage(imageSrc, altText = "CHUUG Vessel") {
		const firstSlide = this.container.querySelector(".swiper-slide img");
		if (firstSlide) {
			firstSlide.src = imageSrc;
			firstSlide.alt = altText;
		}
		this.goToSlide(0);
	}

	/**
	 * Clean up the swiper instance
	 */
	destroy() {
		if (this.swiper) {
			this.swiper.destroy(true, true);
		}
	}
}

