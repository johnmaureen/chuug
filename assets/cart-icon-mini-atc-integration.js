/**
 * Cart Icon to Mini ATC Modal Integration
 *
 * This script overrides the default cart icon behavior to show the Mini ATC Modal
 * in checkout view instead of opening the cart drawer.
 */

(function () {
	"use strict";

	function initCartIconIntegration() {
		const cartIcon = document.querySelector("#cart-icon-bubble");
		const miniATCModal = document.querySelector(".mini-atc-modal");

		if (!cartIcon || !miniATCModal) {
			console.warn("Cart icon or Mini ATC Modal not found", {
				cartIcon: !!cartIcon,
				miniATCModal: !!miniATCModal,
			});
			return;
		}

		// Ensure cart icon is enabled/ready
		if (!cartIcon.classList.contains('ready')) {
			cartIcon.classList.add('ready');
			cartIcon.setAttribute('title', 'View cart');
			cartIcon.setAttribute('aria-label', 'View cart');
			console.log('✅ Cart icon enabled via integration script');
		}

		// Remove existing cart drawer event listeners by cloning the element
		const newCartIcon = cartIcon.cloneNode(true);
		// Ensure cloned icon maintains ready state and tooltip
		newCartIcon.classList.add('ready');
		newCartIcon.setAttribute('title', 'View cart');
		newCartIcon.setAttribute('aria-label', 'View cart');
		cartIcon.parentNode.replaceChild(newCartIcon, cartIcon);

		// Add new event listener for mini ATC modal
		newCartIcon.addEventListener("click", function (event) {
			event.preventDefault();
			event.stopPropagation();

			// Get the modal instance and open it in checkout view
			const modalId = miniATCModal.id;

			if (window.MiniATCModal && window.MiniATCModal.getInstance) {
				const modalInstance = window.MiniATCModal.getInstance(modalId);
				if (modalInstance) {
					// Show loading spinner
					modalInstance.showCartLoadingSpinner();

					modalInstance.open("cart-icon");
					// Switch to checkout view immediately
					setTimeout(async () => {
						modalInstance.switchView("checkout");
						try {
							// Update checkout view with current cart items (this will handle empty cart state)
							await modalInstance.updateCheckoutView();
						} finally {
							// Hide loading spinner
							modalInstance.hideCartLoadingSpinner();
						}
					}, 10); // Very fast response
				} else {
					console.warn("Mini ATC Modal instance not found for ID:", modalId);
				}
			} else if (window.openMiniATCModal) {
				// Fallback to global function
				window.openMiniATCModal(modalId);
				// Try to switch to checkout view
				setTimeout(async () => {
					const instance = window.MiniATCModal?.getInstance(modalId);
					if (instance) {
						// Set opening context for fallback case
						instance.openingContext = "cart-icon";

						// Show loading spinner
						instance.showCartLoadingSpinner();

						instance.switchView("checkout");
						try {
							// Update checkout view with current cart items
							await instance.updateCheckoutView();
						} finally {
							// Hide loading spinner
							instance.hideCartLoadingSpinner();
						}
					}
				}, 10); // Very fast response
			} else {
				console.warn("Mini ATC Modal system not available");
			}
		});

		// Handle keyboard navigation (space key)
		newCartIcon.addEventListener("keydown", function (event) {
			if (event.code.toUpperCase() === "SPACE") {
				event.preventDefault();
				newCartIcon.click();
			}
		});

		console.log("Cart icon successfully connected to Mini ATC Modal");
	}

	// Initialize when DOM is ready and modal system is available
	function waitForModalSystem() {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", function () {
				setTimeout(initCartIconIntegration, 500);
			});
		} else {
			setTimeout(initCartIconIntegration, 500);
		}
	}

	// Also listen for the custom modal ready event
	document.addEventListener("miniATCModalReady", function () {
		setTimeout(initCartIconIntegration, 100);
	});

	waitForModalSystem();
})();
