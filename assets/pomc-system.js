(function () {
	"use strict";

	// ========================================
	// CONSTANTS AND INITIAL STATE
	// ========================================
	const STORAGE_KEY = "chuug_vessel_selections";
	const DEFAULT_VESSEL_COUNT = 3;
	const DEBOUNCE_DELAY = 100;
	const VALIDATION_DELAY = 200;
	const CHARCOAL_UPGRADE_PRICE = 299; // Price in cents (299 = $2.99)

	const DEFAULT_VESSEL_SELECTIONS = {
		1: {
			woodType: null,
			ropeType: null,
			woodVariantId: null,
			ropeVariantId: null,
			productId: null,
			productHandle: null,
		},
		2: {
			woodType: null,
			ropeType: null,
			woodVariantId: null,
			ropeVariantId: null,
			productId: null,
			productHandle: null,
		},
		3: {
			woodType: null,
			ropeType: null,
			woodVariantId: null,
			ropeVariantId: null,
			productId: null,
			productHandle: null,
		},
	};

	// ========================================
	// STATE MANAGEMENT
	// ========================================
	let state = {
		vesselSelections: { ...DEFAULT_VESSEL_SELECTIONS },
		currentProductId: null,
		currentProductHandle: null,
		multiplier: 1,
		activeVessel: 1,
		currentVesselCount: DEFAULT_VESSEL_COUNT,
		selectedProductAmount: 2, // Default to 2 (most popular)
		selectedProductAmountData: null, // Will store the product data for selected amount
		updateTimeout: null,
		validationTimeout: null,
		imageCache: new Map(),
		domCache: new Map(),
		vesselUIState: new Map(), // Track UI state per vessel
	};

	// ========================================
	// UTILITY FUNCTIONS
	// ========================================
	function debounce(func, delay) {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
		};
	}

	function getProductIdForCombination(woodType, ropeType) {
		// Product mapping based on wood/rope combinations
		const productMapping = {
			DUSK_CHARCOAL: window.PRODUCT_IDS?.dusk_charcoal || null,
			DUSK_NATURAL: window.PRODUCT_IDS?.dusk_natural || null,
			DAWN_CHARCOAL: window.PRODUCT_IDS?.dawn_charcoal || null,
			DAWN_NATURAL: window.PRODUCT_IDS?.dawn_natural || null,
			MIDNIGHT_CHARCOAL: window.PRODUCT_IDS?.midnight_charcoal || null,
			MIDNIGHT_NATURAL: window.PRODUCT_IDS?.midnight_natural || null,
		};

		if (woodType && ropeType) {
			const combination = `${woodType.toUpperCase()}_${ropeType.toUpperCase()}`;
			return productMapping[combination] || null;
		}

		return null;
	}

	function getProductHandleForCombination(woodType, ropeType) {
		// Product handle mapping based on wood/rope combinations
		const productHandleMapping = {
			DUSK_CHARCOAL: window.PRODUCT_HANDLES?.dusk_charcoal || null,
			DUSK_NATURAL: window.PRODUCT_HANDLES?.dusk_natural || null,
			DAWN_CHARCOAL: window.PRODUCT_HANDLES?.dawn_charcoal || null,
			DAWN_NATURAL: window.PRODUCT_HANDLES?.dawn_natural || null,
			MIDNIGHT_CHARCOAL: window.PRODUCT_HANDLES?.midnight_charcoal || null,
			MIDNIGHT_NATURAL: window.PRODUCT_HANDLES?.midnight_natural || null,
		};

		if (woodType && ropeType) {
			const combination = `${woodType.toUpperCase()}_${ropeType.toUpperCase()}`;
			return productHandleMapping[combination] || null;
		}

		return null;
	}

	function getProductAmountData(amount) {
		// Use the global helper function if available, otherwise fallback to direct access
		if (
			window.getProductAmountData &&
			typeof window.getProductAmountData === "function"
		) {
			return window.getProductAmountData(amount);
		}

		// Fallback to direct access
		if (
			!window.PRODUCT_AMOUNT_PRODUCTS ||
			!window.PRODUCT_AMOUNT_PRODUCTS[amount]
		) {
			return null;
		}

		return window.PRODUCT_AMOUNT_PRODUCTS[amount];
	}

	function updateSelectedProductAmountData(amount) {
		state.selectedProductAmount = amount;
		state.selectedProductAmountData = getProductAmountData(amount);

		// Save to storage
		storage.save();

		// Dispatch event for mini ATC modal
		document.dispatchEvent(
			new CustomEvent("pomcProductAmountChanged", {
				detail: {
					amount: amount,
					data: state.selectedProductAmountData,
				},
			})
		);
	}

	function calculateCharcoalUpgradePrice() {
		let charcoalCount = 0;
		
		// Count how many vessels have charcoal rope selected (only for active vessels)
		for (let vesselNum = 1; vesselNum <= state.currentVesselCount; vesselNum++) {
			const selection = state.vesselSelections[vesselNum];
			if (selection.ropeType && selection.ropeType.toLowerCase() === 'charcoal') {
				charcoalCount++;
				console.log(`POMC: Vessel #${vesselNum} has charcoal rope`);
			}
		}
		
		const totalUpgradePrice = charcoalCount * CHARCOAL_UPGRADE_PRICE;
		console.log(`POMC: Charcoal count: ${charcoalCount}, Total upgrade: ${formatMoney(totalUpgradePrice)}`);
		
		return totalUpgradePrice;
	}

	function dispatchCharcoalUpgradePriceEvent() {
		const upgradePrice = calculateCharcoalUpgradePrice();
		
		const eventDetail = {
			upgradePrice: upgradePrice,
			upgradePriceFormatted: formatMoney(upgradePrice),
			charcoalCount: Math.floor(upgradePrice / CHARCOAL_UPGRADE_PRICE),
		};
		
		console.log('POMC: Dispatching charcoal upgrade price event:', eventDetail);
		
		// Dispatch event for price update
		document.dispatchEvent(
			new CustomEvent("pomcCharcoalUpgradePrice", {
				detail: eventDetail,
			})
		);
		
		return upgradePrice;
	}

	function formatMoney(cents) {
		// Format cents to money string (e.g., 299 -> "$2.99")
		const dollars = (cents / 100).toFixed(2);
		return `$${dollars}`;
	}

	function getFromCache(key, selector) {
		if (!state.domCache.has(key)) {
			const element = document.querySelector(selector);
			if (element) state.domCache.set(key, element);
		}
		return state.domCache.get(key);
	}

	function getAllFromCache(key, selector) {
		if (!state.domCache.has(key)) {
			const elements = document.querySelectorAll(selector);
			if (elements.length) state.domCache.set(key, elements);
		}
		return state.domCache.get(key) || [];
	}

	function clearDomCache() {
		state.domCache.clear();
	}

	// ========================================
	// STORAGE FUNCTIONS
	// ========================================
	const storage = {
		save() {
			try {
				const dataToSave = {
					vesselSelections: state.vesselSelections,
					currentProductId: state.currentProductId,
					currentProductHandle: state.currentProductHandle,
					multiplier: state.multiplier,
					selectedProductAmount: state.selectedProductAmount,
					selectedProductAmountData: state.selectedProductAmountData,
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
			} catch (error) {
				// Silent fail for storage issues
			}
		},

		load() {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);

					// Handle legacy data structure (backward compatibility)
					if (parsed.vesselSelections) {
						// New structure
						state.vesselSelections = {
							...DEFAULT_VESSEL_SELECTIONS,
							...parsed.vesselSelections,
						};
						state.currentProductId = parsed.currentProductId || null;
						state.currentProductHandle = parsed.currentProductHandle || null;
						state.multiplier = parsed.multiplier || 1;
						state.selectedProductAmount = parsed.selectedProductAmount || 2;
						state.selectedProductAmountData =
							parsed.selectedProductAmountData || null;
					} else {
						// Legacy structure - migrate old data
						state.vesselSelections = {
							...DEFAULT_VESSEL_SELECTIONS,
							...parsed,
						};
						state.currentProductId = null;
						state.currentProductHandle = null;
						state.multiplier = 1;
						state.selectedProductAmount = 2;
						state.selectedProductAmountData = null;
					}
					return true;
				}
			} catch (error) {
				// Silent fail for storage issues
			}
			return false;
		},

		clear() {
			try {
				localStorage.removeItem(STORAGE_KEY);
				state.vesselSelections = { ...DEFAULT_VESSEL_SELECTIONS };
				state.currentProductId = null;
				state.currentProductHandle = null;
				state.multiplier = 1;
				state.selectedProductAmount = 2;
				state.selectedProductAmountData = null;
			} catch (error) {
				// Silent fail for storage issues
			}
		},
	};

	// ========================================
	// SELECTION MANAGEMENT
	// ========================================
	function updateVesselSelection(vesselNumber, type, value, variantId = null) {
		state.vesselSelections[vesselNumber][type] = value;

		// Update variant ID if provided
		if (variantId !== null) {
			if (type === "woodType") {
				state.vesselSelections[vesselNumber].woodVariantId = variantId;
			} else if (type === "ropeType") {
				state.vesselSelections[vesselNumber].ropeVariantId = variantId;
			}
		}

		// Update product ID and handle based on wood/rope combination
		const selection = state.vesselSelections[vesselNumber];
		const productId = getProductIdForCombination(
			selection.woodType,
			selection.ropeType
		);
		const productHandle = getProductHandleForCombination(
			selection.woodType,
			selection.ropeType
		);
		state.vesselSelections[vesselNumber].productId = productId;
		state.vesselSelections[vesselNumber].productHandle = productHandle;

		// Debug logging

		// Maintain UI state for this vessel
		maintainVesselUIState(vesselNumber);

		// Dispatch charcoal upgrade price event if rope type changed
		if (type === "ropeType") {
			dispatchCharcoalUpgradePriceEvent();
		}

		// Clear timeouts and debounce updates
		clearTimeout(state.updateTimeout);
		clearTimeout(state.validationTimeout);

		state.updateTimeout = setTimeout(() => {
			storage.save();
			updateSelectionDisplay(false);
		}, DEBOUNCE_DELAY);

		state.validationTimeout = setTimeout(() => {
			const validation = validateVesselSelections();
			showValidationFeedback(validation);
		}, VALIDATION_DELAY);
	}

	function maintainVesselUIState(vesselNumber) {
		const vesselPanel = document.getElementById(`tab${vesselNumber}`);
		if (!vesselPanel) return;

		const selection = state.vesselSelections[vesselNumber];

		// Store current UI state for this vessel
		const uiState = {
			woodType: selection.woodType,
			ropeType: selection.ropeType,
			woodInputs: [],
			ropeInputs: [],
		};

		// Capture wood type input states
		const woodInputs = vesselPanel.querySelectorAll(
			'input[name^="wood_material_"]'
		);
		woodInputs.forEach((input) => {
			uiState.woodInputs.push({
				value: input.value,
				checked: input.checked,
				labelActive: input
					.closest(".wood-type-label")
					.classList.contains("active"),
			});
		});

		// Capture rope type input states
		const ropeInputs = vesselPanel.querySelectorAll(
			'input[name^="rope_material_"]'
		);
		ropeInputs.forEach((input) => {
			uiState.ropeInputs.push({
				value: input.value,
				checked: input.checked,
				labelActive: input
					.closest(".rope-type-label")
					.classList.contains("active"),
			});
		});

		state.vesselUIState.set(vesselNumber, uiState);
	}

	function restoreVesselUIState(vesselNumber) {
		const uiState = state.vesselUIState.get(vesselNumber);
		if (!uiState) return;

		const vesselPanel = document.getElementById(`tab${vesselNumber}`);
		if (!vesselPanel) return;

		// Restore wood type selections
		if (uiState.woodType) {
			const woodInput = vesselPanel.querySelector(
				`input[name="wood_material_${vesselNumber}"][value="${uiState.woodType}"]`
			);
			if (woodInput) {
				woodInput.checked = true;
				vesselPanel.querySelectorAll(".wood-type-label").forEach((label) => {
					label.classList.remove("active");
				});
				woodInput.closest(".wood-type-label").classList.add("active");
			}
		}

		// Restore rope type selections
		if (uiState.ropeType) {
			const ropeInput = vesselPanel.querySelector(
				`input[name="rope_material_${vesselNumber}"][value="${uiState.ropeType}"]`
			);
			if (ropeInput) {
				ropeInput.checked = true;
				vesselPanel.querySelectorAll(".rope-type-label").forEach((label) => {
					label.classList.remove("active");
				});
				ropeInput.closest(".rope-type-label").classList.add("active");
			}
		}
	}

	function clearAllPreselectedOptions() {
		const allInputs = getAllFromCache(
			"allInputs",
			'input[name^="wood_material_"], input[name^="rope_material_"]'
		);
		allInputs.forEach((input) => {
			input.checked = false;
			const label = input.closest("label");
			if (label) label.classList.remove("active");
		});
	}

	function clearPreselectedOptionsForHiddenVessels(maxVesselCount) {
		// Only clear options for vessels beyond the current count
		for (let i = maxVesselCount + 1; i <= 3; i++) {
			const vesselInputs = document.querySelectorAll(
				`input[name^="wood_material_${i}"], input[name^="rope_material_${i}"]`
			);
			vesselInputs.forEach((input) => {
				input.checked = false;
				const label = input.closest("label");
				if (label) label.classList.remove("active");
			});
		}
	}

	function restoreValidVesselStates(maxVesselCount) {
		// Restore UI state for vessels that are still visible
		for (let vesselNum = 1; vesselNum <= maxVesselCount; vesselNum++) {
			const selection = state.vesselSelections[vesselNum];
			if (selection && (selection.woodType || selection.ropeType)) {
				const vesselPanel = document.getElementById(`tab${vesselNum}`);
				if (!vesselPanel) continue;

				// Restore wood type selection
				if (selection.woodType) {
					const woodInput = vesselPanel.querySelector(
						`input[name="wood_material_${vesselNum}"][value="${selection.woodType}"]`
					);
					if (woodInput) {
						woodInput.checked = true;
						vesselPanel
							.querySelectorAll(".wood-type-label")
							.forEach((label) => {
								label.classList.remove("active");
							});
						woodInput.closest(".wood-type-label").classList.add("active");
					}
				}

				// Restore rope type selection
				if (selection.ropeType) {
					const ropeInput = vesselPanel.querySelector(
						`input[name="rope_material_${vesselNum}"][value="${selection.ropeType}"]`
					);
					if (ropeInput) {
						ropeInput.checked = true;
						vesselPanel
							.querySelectorAll(".rope-type-label")
							.forEach((label) => {
								label.classList.remove("active");
							});
						ropeInput.closest(".rope-type-label").classList.add("active");
					}
				}

				// Update the UI state for this vessel
				maintainVesselUIState(vesselNum);
			}
		}
	}

	function restoreUIFromSelections() {
		for (let vesselNum = 1; vesselNum <= 3; vesselNum++) {
			const selection = state.vesselSelections[vesselNum];
			const vesselPanel = document.getElementById(`tab${vesselNum}`);

			if (!vesselPanel || !selection) continue;

			// Restore wood type selection
			if (selection.woodType) {
				const woodInput = vesselPanel.querySelector(
					`input[name="wood_material_${vesselNum}"][value="${selection.woodType}"]`
				);
				if (woodInput) {
					woodInput.checked = true;
					vesselPanel.querySelectorAll(".wood-type-label").forEach((label) => {
						label.classList.remove("active");
					});
					woodInput.closest(".wood-type-label").classList.add("active");
				}
			}

			// Restore rope type selection
			if (selection.ropeType) {
				const ropeInput = vesselPanel.querySelector(
					`input[name="rope_material_${vesselNum}"][value="${selection.ropeType}"]`
				);
				if (ropeInput) {
					ropeInput.checked = true;
					vesselPanel.querySelectorAll(".rope-type-label").forEach((label) => {
						label.classList.remove("active");
					});
					ropeInput.closest(".rope-type-label").classList.add("active");
				}
			}

			// Store initial UI state for this vessel
			maintainVesselUIState(vesselNum);
		}
	}

	// ========================================
	// TAB MANAGEMENT
	// ========================================
	function initializeTabs() {
		const tabComponent = getFromCache("tabComponent", "[data-tabs]");
		if (!tabComponent) return;

		const tabs = getAllFromCache("tabs", "[data-tab]");
		const contents = getAllFromCache("contents", '[id^="tab"]');

		// Use event delegation for better performance
		tabComponent.addEventListener("click", function (e) {
			const btn = e.target.closest("[data-tab]");
			if (!btn) return;

			const target = btn.getAttribute("data-tab");
			const vesselNumber = parseInt(target.replace("tab", ""));

			// Update active tab styles
			tabs.forEach((b) => {
				b.classList.remove("active");
				b.classList.add("inactive");
			});
			btn.classList.remove("inactive");
			btn.classList.add("active");

			// Toggle content
			contents.forEach((c) => {
				c.classList.remove("active");
				c.style.display = "none";
				if (c.id === target) {
					c.classList.add("active");
					c.style.display = "block";
				}
			});

			// Update active vessel
			state.activeVessel = vesselNumber;

			// Restore UI state for the newly active vessel
			restoreVesselUIState(vesselNumber);

			updateSelectionDisplay(true);
		});
	}

	// ========================================
	// SELECTION INPUT HANDLERS
	// ========================================
	function initializeSelectionInputs() {
		const customizeVessel = getFromCache(
			"customizeVessel",
			".customize-your-vessel"
		);
		if (!customizeVessel) return;

		// Use event delegation for better performance
		customizeVessel.addEventListener("change", function (e) {
			const input = e.target;

			if (input.name && input.name.startsWith("wood_material_")) {
				handleWoodSelection(input);
			} else if (input.name && input.name.startsWith("rope_material_")) {
				handleRopeSelection(input);
			}
		});
	}

	function handleWoodSelection(input) {
		const vesselPanel = input.closest(".vessel-tab-panel");
		if (!vesselPanel) return;

		const vesselNumber = parseInt(vesselPanel.id.replace("tab", ""));
		const woodType = input.value;
		const woodVariantId = input.dataset.variantId || null;

		// Update active state for wood type labels
		vesselPanel.querySelectorAll(".wood-type-label").forEach((label) => {
			label.classList.remove("active");
		});
		input.closest(".wood-type-label").classList.add("active");

		updateVesselSelection(vesselNumber, "woodType", woodType, woodVariantId);
	}

	function handleRopeSelection(input) {
		const vesselPanel = input.closest(".vessel-tab-panel");
		if (!vesselPanel) return;

		const vesselNumber = parseInt(vesselPanel.id.replace("tab", ""));
		const ropeType = input.value;
		const ropeVariantId = input.dataset.variantId || null;

		console.log(`POMC: Rope selection - Vessel #${vesselNumber}, Type: ${ropeType}`);

		// Update active state for rope type labels
		vesselPanel.querySelectorAll(".rope-type-label").forEach((label) => {
			label.classList.remove("active");
		});
		input.closest(".rope-type-label").classList.add("active");

		updateVesselSelection(vesselNumber, "ropeType", ropeType, ropeVariantId);
	}

	// ========================================
	// DISPLAY FUNCTIONS
	// ========================================
	function updateSelectionDisplay(isTabSwitch = false) {
		const selectionWrap = getFromCache(
			"selectionWrap",
			".selection-result-wrap"
		);
		const noSelectionText = getFromCache(
			"noSelectionText",
			".no-selection-text"
		);

		if (!selectionWrap || !noSelectionText) return;

		// Clear CSS classes
		selectionWrap.classList.remove("result-1", "result-2", "result-3");

		// Check if we have any selections
		let hasAnySelections = false;
		for (let vesselNum = 1; vesselNum <= 3; vesselNum++) {
			const selection = state.vesselSelections[vesselNum];
			if (selection.woodType || selection.ropeType) {
				hasAnySelections = true;
				break;
			}
		}

		// Show/hide no selection text
		if (
			hasAnySelections ||
			state.vesselSelections[state.activeVessel].woodType ||
			state.vesselSelections[state.activeVessel].ropeType
		) {
			noSelectionText.style.display = "none";
		} else {
			noSelectionText.style.display = "block";
			return;
		}

		// Update result items for current vessel count
		for (
			let vesselNum = 1;
			vesselNum <= state.currentVesselCount;
			vesselNum++
		) {
			const selection = state.vesselSelections[vesselNum];

			let resultItem = selectionWrap.querySelector(
				`.result-item[data-vessel="${vesselNum}"]`
			);

			if (!resultItem) {
				resultItem = createResultItem(vesselNum);
				insertResultItemAtPosition(selectionWrap, resultItem, vesselNum);
			}

			updateResultItemContent(resultItem, selection, vesselNum, isTabSwitch);
		}

		// Remove result items beyond current vessel count
		const allResultItems = selectionWrap.querySelectorAll(".result-item");
		allResultItems.forEach((item) => {
			const itemVesselNum = parseInt(item.getAttribute("data-vessel"));
			if (itemVesselNum > state.currentVesselCount) {
				item.remove();
			}
		});

		// Apply CSS class based on number of vessels shown
		const vesselCount = selectionWrap.querySelectorAll(".result-item").length;
		if (vesselCount > 0) {
			selectionWrap.classList.add(`result-${vesselCount}`);
		}
	}

	function createResultItem(vesselNum) {
		const resultItem = document.createElement("div");
		resultItem.className = "result-item";
		resultItem.setAttribute("data-vessel", vesselNum);

		// Add click handler to switch vessels
		resultItem.addEventListener("click", () => switchToVessel(vesselNum));

		return resultItem;
	}

	function insertResultItemAtPosition(container, newItem, vesselNum) {
		const existingItems = container.querySelectorAll(".result-item");
		let insertBefore = null;

		for (let i = 0; i < existingItems.length; i++) {
			const existingVesselNum = parseInt(
				existingItems[i].getAttribute("data-vessel")
			);
			if (vesselNum < existingVesselNum) {
				insertBefore = existingItems[i];
				break;
			}
		}

		if (insertBefore) {
			container.insertBefore(newItem, insertBefore);
		} else {
			container.appendChild(newItem);
		}
	}

	function updateResultItemContent(
		resultItem,
		selection,
		vesselNum,
		isTabSwitch
	) {
		// Get or create existing elements
		let imgWrap = resultItem.querySelector(".img-wrap");
		let img = resultItem.querySelector(".img-wrap img");
		let text = resultItem.querySelector("p");

		if (!imgWrap) {
			imgWrap = document.createElement("div");
			imgWrap.className = "img-wrap";
			resultItem.appendChild(imgWrap);
		}

		if (!img) {
			img = document.createElement("img");
			imgWrap.appendChild(img);
		}

		if (!text) {
			text = document.createElement("p");
			resultItem.appendChild(text);
		}

		// Determine content
		let newImageSrc = "";
		let newAltText = "";
		let shouldShowLoading = false;

		if (selection.woodType && selection.ropeType) {
			// Complete selection
			const imageName = `${selection.woodType.toLowerCase()}_${selection.ropeType.toLowerCase()}.png`;
			newAltText = `${selection.woodType} ${selection.ropeType} Vessel #${vesselNum}`;

			// Check cache first
			if (state.imageCache.has(imageName)) {
				newImageSrc = state.imageCache.get(imageName);
			} else {
				// Use Shopify's asset URL format - this will be replaced by Liquid template
				newImageSrc = window.SHOPIFY_ASSET_URL_TEMPLATE
					? window.SHOPIFY_ASSET_URL_TEMPLATE.replace(
							"dusk_natural.png",
							imageName
					  )
					: `/assets/${imageName}`;
				shouldShowLoading = !isTabSwitch && vesselNum === state.activeVessel;
			}
		} else {
			// Partial or no selection
			newImageSrc =
				"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI0IiBoZWlnaHQ9IjE1MiIgdmlld0JveD0iMCAwIDEyNCAxNTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjQiIGhlaWdodD0iMTUyIiBmaWxsPSIjMWExYTFhIi8+Cjwvc3ZnPgo=";
			newAltText =
				isTabSwitch || vesselNum !== state.activeVessel
					? "Partial selection"
					: "Loading...";
			shouldShowLoading = !isTabSwitch && vesselNum === state.activeVessel;
		}

		// Update image efficiently
		if (img.src !== newImageSrc) {
			if (selection.woodType && selection.ropeType) {
				const imageName = `${selection.woodType.toLowerCase()}_${selection.ropeType.toLowerCase()}.png`;
				if (!state.imageCache.has(imageName)) {
					loadImageOptimized(
						img,
						newImageSrc,
						selection,
						shouldShowLoading,
						resultItem
					);
				} else {
					img.src = newImageSrc;
					img.style.display = "block";
				}
			} else {
				img.src = newImageSrc;
				img.style.display = "block";
			}
		}

		img.alt = newAltText;

		// Update text content
		updateTextContent(text, selection, vesselNum);

		// Update loading and active states
		if (shouldShowLoading) {
			resultItem.classList.add("loading");
		} else {
			resultItem.classList.remove("loading");
		}

		if (!selection.woodType && !selection.ropeType) {
			resultItem.classList.add("active-vessel");
		} else {
			resultItem.classList.remove("active-vessel");
		}
	}

	function loadImageOptimized(
		img,
		src,
		selection,
		shouldShowLoading,
		resultItem
	) {
		const imageName = `${selection.woodType.toLowerCase()}_${selection.ropeType.toLowerCase()}.png`;

		img.style.display = "none";
		const preloadImg = new Image();

		preloadImg.onload = function () {
			state.imageCache.set(imageName, preloadImg.src);
			img.src = preloadImg.src;
			img.style.display = "block";
			if (shouldShowLoading) resultItem.classList.remove("loading");
		};

		preloadImg.onerror = function () {
			img.style.display = "block";
			img.src =
				"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI0IiBoZWlnaHQ9IjE1MiIgdmlld0JveD0iMCAwIDEyNCAxNTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjQiIGhlaWdodD0iMTUyIiBmaWxsPSIjMWExYTFhIi8+Cjwvc3ZnPgo=";
			if (shouldShowLoading) resultItem.classList.remove("loading");
		};

		preloadImg.src = src;
	}

	function updateTextContent(text, selection, vesselNum) {
		if (selection.woodType || selection.ropeType) {
			if (selection.woodType && selection.ropeType) {
				text.textContent = `${selection.woodType} • ${selection.ropeType}`;
			} else {
				const selectedParts = [];
				if (selection.woodType) selectedParts.push(selection.woodType);
				if (selection.ropeType) selectedParts.push(selection.ropeType);
				text.textContent = `${selectedParts.join(" • ")} • ...`;
			}
			text.style.opacity = "";
		} else {
			text.textContent = `Vessel #${vesselNum}`;
			text.style.opacity = "0.5";
		}
	}

	function switchToVessel(vesselNumber) {
		if (vesselNumber >= 1 && vesselNumber <= 3) {
			const tabButton = document.querySelector(
				`[data-tab="tab${vesselNumber}"]`
			);
			if (tabButton) tabButton.click();
		}
	}

	// ========================================
	// VESSEL COUNT MANAGEMENT
	// ========================================
	function updateVesselTabVisibility(vesselCount) {
		const vesselCountNum = parseInt(vesselCount);
		state.currentVesselCount = vesselCountNum;
		state.multiplier = vesselCountNum; // Update multiplier to match vessel count

		// Check if current active vessel is beyond the new count
		if (state.activeVessel > vesselCountNum) {
			state.activeVessel = 1;
			// Immediately switch to vessel 1 to ensure proper state restoration
			switchToVessel(1);
		}

		// Update vessel tab buttons visibility
		for (let i = 1; i <= 3; i++) {
			const tabButton = document.querySelector(`.vessel_number_${i}`);
			const tabPanel = document.querySelector(`#tab${i}`);

			if (tabButton && tabPanel) {
				if (i <= vesselCountNum) {
					tabButton.style.display = "flex";
					if (i === state.activeVessel) {
						tabPanel.style.display = "block";
						tabButton.classList.remove("inactive");
						tabButton.classList.add("active");
					} else {
						tabPanel.style.display = "none";
						tabButton.classList.remove("active");
						tabButton.classList.add("inactive");
					}
				} else {
					tabButton.style.display = "none";
					tabPanel.style.display = "none";
					tabButton.classList.remove("active", "inactive");
				}
			}
		}

		// Clear selections for vessels beyond the new vessel count
		for (let i = vesselCountNum + 1; i <= 3; i++) {
			if (
				state.vesselSelections[i] &&
				(state.vesselSelections[i].woodType ||
					state.vesselSelections[i].ropeType)
			) {
				state.vesselSelections[i] = {
					woodType: null,
					ropeType: null,
					woodVariantId: null,
					ropeVariantId: null,
					productId: null,
					productHandle: null,
				};

				// Clear UI state for this vessel
				state.vesselUIState.delete(i);

				// Clear radio button selections for this vessel
				const vesselInputs = document.querySelectorAll(
					`input[name^="wood_material_${i}"], input[name^="rope_material_${i}"]`
				);
				vesselInputs.forEach((input) => {
					input.checked = false;
					input.closest("label").classList.remove("active");
				});
			}
		}

		storage.save();

		// Dispatch charcoal upgrade price event since vessel count changed
		dispatchCharcoalUpgradePriceEvent();

		// Clear pre-selected options only for vessels beyond the current count, then restore valid vessels
		requestAnimationFrame(() => {
			clearPreselectedOptionsForHiddenVessels(vesselCountNum);
			restoreValidVesselStates(vesselCountNum);

			// Ensure the current active vessel's state is properly restored
			if (state.activeVessel <= vesselCountNum) {
				restoreVesselUIState(state.activeVessel);
			}

			updateSelectionDisplay(false);

		// Validate button state after vessel count change
		const vesselValidation = validateAllVesselsForAddToCart();
		const cta_button = document.querySelector(".cta-button");
		const incompletText = document.querySelector(".incompleted-inputs-text");

		if (!vesselValidation.isValid) {
			if (cta_button) {
				cta_button.setAttribute("disabled", true);
			}
			if (incompletText) {
				incompletText.style.display = "block";
			}
		} else {
			// Only enable if other validations also pass
			if (window.thereAreNoIncompleteInputs && cta_button) {
				const originalValidation =
					window.thereAreNoIncompleteInputs(vesselCountNum);
				if (originalValidation) {
					cta_button.removeAttribute("disabled");
					if (incompletText) {
						incompletText.style.display = "none";
					}
				}
			}
		}
		});
	}

	// ========================================
	// VALIDATION
	// ========================================
	function validateVesselSelections() {
		const warnings = [];

		for (let vesselNum = 1; vesselNum <= 3; vesselNum++) {
			const selection = state.vesselSelections[vesselNum];

			if (
				(selection.woodType && !selection.ropeType) ||
				(!selection.woodType && selection.ropeType)
			) {
				warnings.push(`Vessel #${vesselNum} has incomplete selection`);
			}
		}

		return { errors: [], warnings };
	}

	function validateAllVesselsForAddToCart() {
		const errors = [];
		const currentVesselCount = state.currentVesselCount;

		for (let vesselNum = 1; vesselNum <= currentVesselCount; vesselNum++) {
			const selection = state.vesselSelections[vesselNum];

			if (!selection.woodType || !selection.ropeType) {
				errors.push(`Vessel #${vesselNum} is missing required selections`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors: errors,
			message:
				errors.length > 0
					? "Please fill all vessel selections before adding to cart."
					: null,
		};
	}

	function showValidationFeedback(validation) {
		const existingFeedback = document.querySelector(".validation-feedback");
		if (existingFeedback) existingFeedback.remove();

		if (validation.warnings.length > 0) {
			const feedback = document.createElement("div");
			feedback.className =
				"validation-feedback tw-mt-2 tw-p-2 tw-bg-yellow-100 tw-text-yellow-800 tw-rounded tw-text-sm";
			feedback.innerHTML = validation.warnings
				.map((warning) => `⚠️ ${warning}`)
				.join("<br>");

			const selectionWrap = getFromCache(
				"selectionWrap",
				".selection-result-wrap"
			);
			if (selectionWrap && selectionWrap.parentNode) {
				selectionWrap.parentNode.insertBefore(
					feedback,
					selectionWrap.nextSibling
				);
			}
		}

		// Only manage button state, not error message display during real-time validation
		const vesselValidation = validateAllVesselsForAddToCart();
		if (window.hideVesselValidationError && vesselValidation.isValid) {
			window.hideVesselValidationError();
		}
	}

	// ========================================
	// PRODUCT AMOUNT OVERRIDE
	// ========================================
	function setupSetProductAmountOverride() {
		if (typeof window.setProductAmount === "function") {
			window.originalSetProductAmount = window.setProductAmount;
		} else {
			return false;
		}

		window.setProductAmount = function (amount) {
			if (window.originalSetProductAmount) {
				window.originalSetProductAmount(amount);
			}
			updateVesselTabVisibility(amount);
			updateSelectedProductAmountData(parseInt(amount, 10));
		};

		// After setting up the override, sync with current UI state
		// Check if there's already an active product amount selection
		const activeLabel1 = document.querySelector(
			".product_amount_label_1.active"
		);
		const activeLabel2 = document.querySelector(
			".product_amount_label_2.active"
		);
		const activeLabel3 = document.querySelector(
			".product_amount_label_3.active"
		);

		let currentActiveAmount = state.selectedProductAmount; // Default to state
		if (activeLabel1) currentActiveAmount = 1;
		else if (activeLabel2) currentActiveAmount = 2;
		else if (activeLabel3) currentActiveAmount = 3;

		// If the active amount differs from state, sync it
		if (
			currentActiveAmount !== state.selectedProductAmount ||
			currentActiveAmount !== state.currentVesselCount
		) {
			console.log(
				`POMC System: Syncing with UI active amount ${currentActiveAmount}`
			);
			updateVesselTabVisibility(currentActiveAmount);
			updateSelectedProductAmountData(currentActiveAmount);
		}

		return true;
	}

	// ========================================
	// INITIALIZATION
	// ========================================
	function initialize() {
		// Initialize state - sync with the selected product amount (default is 2)
		state.currentVesselCount = state.selectedProductAmount;

		// Clear any pre-selected options
		clearAllPreselectedOptions();

		// Initialize components
		initializeTabs();
		initializeSelectionInputs();

		// Load saved selections
		const hasLoadedSelections = storage.load();
		if (hasLoadedSelections) {
			restoreUIFromSelections();
		}

		// Initialize product amount data if not loaded from storage
		if (!state.selectedProductAmountData) {
			updateSelectedProductAmountData(state.selectedProductAmount);
		}

		// Sync vessel tab visibility with initial product amount
		updateVesselTabVisibility(state.selectedProductAmount);

		updateSelectionDisplay(false);

		// Dispatch initial charcoal upgrade price event
		dispatchCharcoalUpgradePriceEvent();

		// Ensure button starts disabled
		const addButton = document.getElementById("add-multiple-products");
		if (addButton) {
			addButton.setAttribute("disabled", true);
		}
		const incompletText = document.querySelector(".incompleted-inputs-text");
		if (incompletText) {
			incompletText.style.display = "block";
		}

		// Setup cleanup on page unload
		const cleanup = debounce(storage.clear, 100);
		window.addEventListener("beforeunload", cleanup);
		document.addEventListener("visibilitychange", function () {
			if (document.hidden) cleanup();
		});
	}

	// ========================================
	// ENTRY POINT
	// ========================================
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}

	// Setup product amount override with fallback attempts
	if (!setupSetProductAmountOverride()) {
		const retrySetup = debounce(() => {
			if (!setupSetProductAmountOverride()) {
				setTimeout(() => setupSetProductAmountOverride(), 1000);
			}
		}, 100);
		retrySetup();
	}

	// ========================================
	// PUBLIC API
	// ========================================
	window.pomcSystem = {
		getCurrentVesselSelection: () => ({
			...state.vesselSelections[state.activeVessel],
			selectedProductAmount: state.selectedProductAmount,
			selectedProductAmountData: state.selectedProductAmountData,
		}),
		getAllVesselSelections: () => ({ ...state.vesselSelections }),
		getVesselSelection: (vesselNumber) =>
			state.vesselSelections[vesselNumber] || null,
		getCurrentProductId: () => state.currentProductId,
		setCurrentProductId: function (productId) {
			state.currentProductId = productId;
			storage.save();
		},
		getCurrentProductHandle: () => state.currentProductHandle,
		setCurrentProductHandle: function (productHandle) {
			state.currentProductHandle = productHandle;
			storage.save();
		},
		getMultiplier: () => state.multiplier,
		setMultiplier: function (multiplier) {
			state.multiplier = multiplier;
			storage.save();
		},
		getSelectedProductAmount: () => state.selectedProductAmount,
		getSelectedProductAmountData: () => state.selectedProductAmountData,
		setSelectedProductAmount: function (amount) {
			updateSelectedProductAmountData(parseInt(amount, 10));
		},
		validateAllVesselsForAddToCart: validateAllVesselsForAddToCart,
		setVesselSelection: function (
			vesselNumber,
			woodType,
			ropeType,
			woodVariantId = null,
			ropeVariantId = null
		) {
			if (vesselNumber >= 1 && vesselNumber <= 3) {
				state.vesselSelections[vesselNumber].woodType = woodType;
				state.vesselSelections[vesselNumber].ropeType = ropeType;
				state.vesselSelections[vesselNumber].woodVariantId = woodVariantId;
				state.vesselSelections[vesselNumber].ropeVariantId = ropeVariantId;

				// Update product ID and handle based on wood/rope combination
				const productId = getProductIdForCombination(woodType, ropeType);
				const productHandle = getProductHandleForCombination(
					woodType,
					ropeType
				);
				state.vesselSelections[vesselNumber].productId = productId;
				state.vesselSelections[vesselNumber].productHandle = productHandle;

				const vesselPanel = document.getElementById(`tab${vesselNumber}`);
				if (vesselPanel) {
					// Update wood type selection
					const woodInput = vesselPanel.querySelector(
						`input[name="wood_material_${vesselNumber}"][value="${woodType}"]`
					);
					if (woodInput) {
						woodInput.checked = true;
						vesselPanel
							.querySelectorAll(".wood-type-label")
							.forEach((label) => {
								label.classList.remove("active");
							});
						woodInput.closest(".wood-type-label").classList.add("active");
					}

					// Update rope type selection
					const ropeInput = vesselPanel.querySelector(
						`input[name="rope_material_${vesselNumber}"][value="${ropeType}"]`
					);
					if (ropeInput) {
						ropeInput.checked = true;
						vesselPanel
							.querySelectorAll(".rope-type-label")
							.forEach((label) => {
								label.classList.remove("active");
							});
						ropeInput.closest(".rope-type-label").classList.add("active");
					}
				}

				// Maintain UI state for this vessel
				maintainVesselUIState(vesselNumber);

				// Dispatch charcoal upgrade price event
				dispatchCharcoalUpgradePriceEvent();

				const validation = validateVesselSelections();
				showValidationFeedback(validation);
				updateSelectionDisplay(false);
			}
		},
		clearVesselSelection: function (vesselNumber) {
			if (vesselNumber >= 1 && vesselNumber <= 3) {
				state.vesselSelections[vesselNumber] = {
					woodType: null,
					ropeType: null,
					woodVariantId: null,
					ropeVariantId: null,
					productId: null,
					productHandle: null,
				};
				state.vesselUIState.delete(vesselNumber);

				const vesselPanel = document.getElementById(`tab${vesselNumber}`);
				if (vesselPanel) {
					// Clear all selections for this vessel
					const vesselInputs = vesselPanel.querySelectorAll(
						'input[name^="wood_material_"], input[name^="rope_material_"]'
					);
					vesselInputs.forEach((input) => {
						input.checked = false;
						input.closest("label").classList.remove("active");
					});
				}

				storage.save();
				
				// Dispatch charcoal upgrade price event
				dispatchCharcoalUpgradePriceEvent();
				
				updateSelectionDisplay(false);
			}
		},
		clearSelections: function () {
			storage.clear();
			state.vesselUIState.clear();
			clearAllPreselectedOptions();
			
			// Dispatch charcoal upgrade price event
			dispatchCharcoalUpgradePriceEvent();
			
			updateSelectionDisplay(false);
		},
		switchToVessel: switchToVessel,
		maintainVesselState: maintainVesselUIState,
		restoreVesselState: restoreVesselUIState,
		getCharcoalUpgradePrice: calculateCharcoalUpgradePrice,
		getCharcoalUpgradePriceFormatted: function() {
			return formatMoney(calculateCharcoalUpgradePrice());
		},
		getCharcoalUpgradeData: function() {
			const charcoalVessels = [];
			
			// Get all vessels with charcoal rope selected (only for active vessels)
			for (let vesselNum = 1; vesselNum <= state.currentVesselCount; vesselNum++) {
				const selection = state.vesselSelections[vesselNum];
				if (selection.ropeType && selection.ropeType.toLowerCase() === 'charcoal') {
					charcoalVessels.push({
						vesselNumber: vesselNum,
						woodType: selection.woodType,
						ropeType: selection.ropeType,
						ropeVariantId: selection.ropeVariantId,
						productId: selection.productId,
						productHandle: selection.productHandle
					});
				}
			}
			
			return {
				charcoalVessels: charcoalVessels,
				charcoalCount: charcoalVessels.length,
				upgradePrice: calculateCharcoalUpgradePrice(),
				upgradePriceFormatted: formatMoney(calculateCharcoalUpgradePrice())
			};
		},
		CHARCOAL_UPGRADE_PRICE: CHARCOAL_UPGRADE_PRICE,
	};
})();
