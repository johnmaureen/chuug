/**
 * Mini ATC Modal Configuration
 * Central configuration for all modal settings
 */

export const CONFIG = {
	STORAGE_KEY: "chuug_mini_atc_selections",
	DEBOUNCE_DELAY: 300,
	ANIMATION_DURATION: 500,
	REVERSE_CART_ORDER: false,
	SWIPER_CONFIG: {
		loop: false,
		speed: 300,
		effect: "slide",
		touchRatio: 1,
		touchAngle: 45,
		grabCursor: true,
		keyboard: {
			enabled: true,
			onlyInViewport: true,
		},
		a11y: {
			prevSlideMessage: "Previous product image",
			nextSlideMessage: "Next product image",
		},
	},
};

