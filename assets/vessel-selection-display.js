(function () {
	"use strict";

	// ========================================
	// VESSEL SELECTION DISPLAY SYSTEM
	// ========================================
	// Based on pomc-system.js image display functionality
	// Adapted for .your-selection .selection-result-wrap

	const STORAGE_KEY = "vessel_selection_display";
	const DEBOUNCE_DELAY = 100;
	const VALIDATION_DELAY = 200;

	// State management
	let displayState = {
		vesselSelections: {},
		currentVesselCount: 2, // Default to 2 vessels
		imageCache: new Map(),
		domCache: new Map(),
		updateTimeout: null,
		validationTimeout: null,
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

	function getFromCache(key, selector) {
		if (!displayState.domCache.has(key)) {
			const element = document.querySelector(selector);
			if (element) displayState.domCache.set(key, element);
		}
		return displayState.domCache.get(key);
	}

	function getAllFromCache(key, selector) {
		if (!displayState.domCache.has(key)) {
			const elements = document.querySelectorAll(selector);
			if (elements.length) displayState.domCache.set(key, elements);
		}
		return displayState.domCache.get(key) || [];
	}

	function clearDomCache() {
		displayState.domCache.clear();
	}

	// ========================================
	// SELECTION TRACKING
	// ========================================
	function trackVesselSelection(vesselNumber, woodType, ropeType) {
		if (!displayState.vesselSelections[vesselNumber]) {
			displayState.vesselSelections[vesselNumber] = {
				woodType: null,
				ropeType: null,
			};
		}

		// Log the selection change
		console.log(`🎯 Vessel Selection Update:`, {
			vesselNumber: vesselNumber,
			woodType: woodType,
			ropeType: ropeType,
			timestamp: new Date().toISOString(),
			previousSelection: {
				woodType: displayState.vesselSelections[vesselNumber].woodType,
				ropeType: displayState.vesselSelections[vesselNumber].ropeType,
			}
		});

		displayState.vesselSelections[vesselNumber].woodType = woodType;
		displayState.vesselSelections[vesselNumber].ropeType = ropeType;

		// Log current state
		console.log(`📊 Current Display State:`, {
			vesselCount: displayState.currentVesselCount,
			selections: { ...displayState.vesselSelections },
			imageCacheSize: displayState.imageCache.size,
		});

		// Debounce updates
		clearTimeout(displayState.updateTimeout);
		displayState.updateTimeout = setTimeout(() => {
			updateSelectionDisplay();
		}, DEBOUNCE_DELAY);
	}

	function updateVesselCount(count) {
		const newCount = parseInt(count, 10);
		console.log(`🔢 Vessel Count Update:`, {
			previousCount: displayState.currentVesselCount,
			newCount: newCount,
			timestamp: new Date().toISOString(),
			callStack: new Error().stack
		});
		
		displayState.currentVesselCount = newCount;
		updateSelectionDisplay();
	}

	// ========================================
	// IMAGE DISPLAY FUNCTIONALITY
	// ========================================
	function updateSelectionDisplay() {
		console.log(`🔄 Updating Selection Display:`, {
			vesselCount: displayState.currentVesselCount,
			selections: { ...displayState.vesselSelections },
			timestamp: new Date().toISOString(),
		});

		const selectionWrap = getFromCache(
			"selectionWrap",
			".selection-result-wrap"
		);
		const noSelectionText = getFromCache(
			"noSelectionText",
			".no-selection-text"
		);

		if (!selectionWrap || !noSelectionText) {
			console.warn(`⚠️ Missing DOM elements:`, {
				selectionWrap: !!selectionWrap,
				noSelectionText: !!noSelectionText,
			});
			return;
		}

		// Clear CSS classes
		selectionWrap.classList.remove("result-1", "result-2", "result-3");

		// Check if we have any selections
		let hasAnySelections = false;
		for (let vesselNum = 1; vesselNum <= 3; vesselNum++) {
			const selection = displayState.vesselSelections[vesselNum];
			if (selection && (selection.woodType || selection.ropeType)) {
				hasAnySelections = true;
				break;
			}
		}

		// Show/hide no selection text
		if (hasAnySelections) {
			noSelectionText.style.display = "none";
		} else {
			noSelectionText.style.display = "block";
			return;
		}

		// Update result items for current vessel count
		for (let vesselNum = 1; vesselNum <= displayState.currentVesselCount; vesselNum++) {
			const selection = displayState.vesselSelections[vesselNum] || {
				woodType: null,
				ropeType: null,
			};

			let resultItem = selectionWrap.querySelector(
				`.result-item[data-vessel="${vesselNum}"]`
			);

			if (!resultItem) {
				resultItem = createResultItem(vesselNum);
				insertResultItemAtPosition(selectionWrap, resultItem, vesselNum);
			}

			updateResultItemContent(resultItem, selection, vesselNum);
		}

		// Remove result items beyond current vessel count
		const allResultItems = selectionWrap.querySelectorAll(".result-item");
		allResultItems.forEach((item) => {
			const itemVesselNum = parseInt(item.getAttribute("data-vessel"));
			if (itemVesselNum > displayState.currentVesselCount) {
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

		// Add click handler to focus on vessel
		resultItem.addEventListener("click", () => focusOnVessel(vesselNum));

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

	function updateResultItemContent(resultItem, selection, vesselNum) {
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
			if (displayState.imageCache.has(imageName)) {
				newImageSrc = displayState.imageCache.get(imageName);
			} else {
				// Use Shopify's asset URL format - same as POMC system
				newImageSrc = window.SHOPIFY_ASSET_URL_TEMPLATE
					? window.SHOPIFY_ASSET_URL_TEMPLATE.replace(
							"dusk_natural.png",
							imageName
					  )
					: `/assets/${imageName}`;
				shouldShowLoading = true;
			}
		} else {
			// Partial or no selection
			newImageSrc =
				"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI0IiBoZWlnaHQ9IjE1MiIgdmlld0JveD0iMCAwIDEyNCAxNTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjQiIGhlaWdodD0iMTUyIiBmaWxsPSIjMWExYTFhIi8+Cjwvc3ZnPgo=";
			newAltText = selection.woodType || selection.ropeType ? "Partial selection" : "No selection";
			shouldShowLoading = false;
		}

		// Update image efficiently
		if (img.src !== newImageSrc) {
			if (selection.woodType && selection.ropeType) {
				const imageName = `${selection.woodType.toLowerCase()}_${selection.ropeType.toLowerCase()}.png`;
				if (!displayState.imageCache.has(imageName)) {
					loadImageOptimized(img, newImageSrc, selection, shouldShowLoading, resultItem);
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

	function loadImageOptimized(img, src, selection, shouldShowLoading, resultItem) {
		const imageName = `${selection.woodType.toLowerCase()}_${selection.ropeType.toLowerCase()}.png`;

		console.log(`🖼️ Loading Image:`, {
			imageName: imageName,
			src: src,
			woodType: selection.woodType,
			ropeType: selection.ropeType,
			shouldShowLoading: shouldShowLoading,
			timestamp: new Date().toISOString(),
		});

		img.style.display = "none";
		const preloadImg = new Image();

		preloadImg.onload = function () {
			console.log(`✅ Image Loaded Successfully:`, {
				imageName: imageName,
				src: preloadImg.src,
				timestamp: new Date().toISOString(),
			});
			
			displayState.imageCache.set(imageName, preloadImg.src);
			img.src = preloadImg.src;
			img.style.display = "block";
			if (shouldShowLoading) resultItem.classList.remove("loading");
		};

		preloadImg.onerror = function () {
			console.error(`❌ Image Load Failed:`, {
				imageName: imageName,
				src: src,
				timestamp: new Date().toISOString(),
			});
			
			img.style.display = "block";
			img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI0IiBoZWlnaHQ9IjE1MiIgdmlld0JveD0iMCAwIDEyNCAxNTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjQiIGhlaWdodD0iMTUyIiBmaWxsPSIjMWExYTFhIi8+Cjwvc3ZnPgo=";
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

	function focusOnVessel(vesselNumber) {
		// Scroll to the vessel customization section
		const vesselSection = document.querySelector(`.vessel_number_${vesselNumber}`);
		if (vesselSection) {
			vesselSection.scrollIntoView({ behavior: "smooth", block: "center" });
			
			// Add a temporary highlight effect
			vesselSection.style.transition = "all 0.3s ease";
			vesselSection.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
			setTimeout(() => {
				vesselSection.style.backgroundColor = "";
			}, 2000);
		}
	}

	// ========================================
	// INTEGRATION WITH EXISTING SYSTEM
	// ========================================
	function initializeIntegration() {
		// Listen for vessel selection changes from the main system
		document.addEventListener("change", function (e) {
			if (e.target.name && e.target.name.startsWith("wood_material_")) {
				handleWoodSelection(e.target);
			} else if (e.target.name && e.target.name.startsWith("rope_material_")) {
				handleRopeSelection(e.target);
			}
		});

		// Listen for dropdown selections (wood and rope types)
		document.addEventListener("click", function (e) {
			// Handle wood type selections
			if (e.target.closest(".wood-type-label")) {
				const input = e.target.closest(".wood-type-label").querySelector("input[type='radio']");
				if (input) {
					handleWoodSelection(input);
				}
			}
			
			// Handle rope type selections
			if (e.target.closest(".rope-type-label")) {
				const input = e.target.closest(".rope-type-label").querySelector("input[type='radio']");
				if (input) {
					handleRopeSelection(input);
				}
			}
		});

	// Listen for product amount changes
	document.addEventListener("click", function (e) {
		if (e.target.onclick && e.target.onclick.toString().includes("setProductAmount")) {
			const match = e.target.onclick.toString().match(/setProductAmount\('(\d+)'\)/);
			if (match) {
				updateVesselCount(match[1]);
			}
		}
	});

	// Override the global setProductAmount function to notify our system
	const originalSetProductAmount = window.setProductAmount;
	if (originalSetProductAmount) {
		window.setProductAmount = function(productAmount) {
			console.log(`🔄 setProductAmount called directly:`, {
				productAmount: productAmount,
				timestamp: new Date().toISOString(),
			});
			
			// Call the original function
			const result = originalSetProductAmount.apply(this, arguments);
			
			// Notify our vessel selection display system
			updateVesselCount(productAmount);
			
			return result;
		};
	}

		// Listen for engraving changes
		document.addEventListener("click", function (e) {
			if (e.target.onclick && e.target.onclick.toString().includes("setEngraving")) {
				// Update display when engraving preference changes
				setTimeout(() => updateSelectionDisplay(), 100);
			}
		});

		// Listen for dropdown state changes
		document.addEventListener("click", function (e) {
			// Handle dropdown selections
			if (e.target.classList.contains("js-option")) {
				const container = e.target.closest(".js-dropdown-container");
				if (container) {
					const vesselNumber = extractVesselNumberFromContainer(container);
					if (vesselNumber) {
						if (container.classList.contains("material")) {
							handleWoodSelection(e.target);
						} else if (container.classList.contains("rope")) {
							handleRopeSelection(e.target);
						}
					}
				}
			}
		});
	}

	function extractVesselNumberFromContainer(container) {
		// Try to extract vessel number from container ID
		const idMatch = container.id.match(/select_(\d+)_/);
		if (idMatch) {
			return parseInt(idMatch[1], 10);
		}

		// Try to find vessel number from parent elements
		const vesselPanel = container.closest(`[class*="vessel_number_"]`);
		if (vesselPanel) {
			const vesselClassMatch = vesselPanel.className.match(/vessel_number_(\d+)/);
			if (vesselClassMatch) {
				return parseInt(vesselClassMatch[1], 10);
			}
		}

		// Try to find vessel number from tab panel
		const tabPanel = container.closest("#tab\\d+");
		if (tabPanel) {
			const tabMatch = tabPanel.id.match(/tab(\d+)/);
			if (tabMatch) {
				return parseInt(tabMatch[1], 10);
			}
		}

		return null;
	}

	function handleWoodSelection(input) {
		console.log(`🌳 Wood Selection Event:`, {
			inputValue: input.value,
			inputName: input.name,
			timestamp: new Date().toISOString(),
		});

		const vesselPanel = input.closest(".vessel-tab-panel") || input.closest(`[class*="vessel_number_"]`);
		if (!vesselPanel) {
			console.warn(`⚠️ No vessel panel found for wood selection`);
			return;
		}

		// Extract vessel number from various possible class patterns
		let vesselNumber = null;
		
		// Try to extract from vessel_number_ class
		const vesselClassMatch = vesselPanel.className.match(/vessel_number_(\d+)/);
		if (vesselClassMatch) {
			vesselNumber = parseInt(vesselClassMatch[1], 10);
		}
		
		// Try to extract from ID pattern
		if (!vesselNumber) {
			const idMatch = vesselPanel.id.match(/tab(\d+)/);
			if (idMatch) {
				vesselNumber = parseInt(idMatch[1], 10);
			}
		}

		// Fallback: try to find vessel number from surrounding elements
		if (!vesselNumber) {
			const vesselLabel = vesselPanel.querySelector("span");
			if (vesselLabel && vesselLabel.textContent.includes("Vessel #")) {
				const match = vesselLabel.textContent.match(/Vessel #(\d+)/);
				if (match) {
					vesselNumber = parseInt(match[1], 10);
				}
			}
		}

		console.log(`🔍 Vessel Number Detection:`, {
			vesselNumber: vesselNumber,
			vesselPanelClass: vesselPanel.className,
			vesselPanelId: vesselPanel.id,
		});

		if (vesselNumber) {
			const woodType = input.value;
			const currentSelection = displayState.vesselSelections[vesselNumber] || {};
			trackVesselSelection(vesselNumber, woodType, currentSelection.ropeType);
		} else {
			console.warn(`⚠️ Could not determine vessel number for wood selection`);
		}
	}

	function handleRopeSelection(input) {
		console.log(`🪢 Rope Selection Event:`, {
			inputValue: input.value,
			inputName: input.name,
			timestamp: new Date().toISOString(),
		});

		const vesselPanel = input.closest(".vessel-tab-panel") || input.closest(`[class*="vessel_number_"]`);
		if (!vesselPanel) {
			console.warn(`⚠️ No vessel panel found for rope selection`);
			return;
		}

		// Extract vessel number (same logic as wood selection)
		let vesselNumber = null;
		
		const vesselClassMatch = vesselPanel.className.match(/vessel_number_(\d+)/);
		if (vesselClassMatch) {
			vesselNumber = parseInt(vesselClassMatch[1], 10);
		}
		
		if (!vesselNumber) {
			const idMatch = vesselPanel.id.match(/tab(\d+)/);
			if (idMatch) {
				vesselNumber = parseInt(idMatch[1], 10);
			}
		}

		if (!vesselNumber) {
			const vesselLabel = vesselPanel.querySelector("span");
			if (vesselLabel && vesselLabel.textContent.includes("Vessel #")) {
				const match = vesselLabel.textContent.match(/Vessel #(\d+)/);
				if (match) {
					vesselNumber = parseInt(match[1], 10);
				}
			}
		}

		console.log(`🔍 Vessel Number Detection (Rope):`, {
			vesselNumber: vesselNumber,
			vesselPanelClass: vesselPanel.className,
			vesselPanelId: vesselPanel.id,
		});

		if (vesselNumber) {
			const ropeType = input.value;
			const currentSelection = displayState.vesselSelections[vesselNumber] || {};
			trackVesselSelection(vesselNumber, currentSelection.woodType, ropeType);
		} else {
			console.warn(`⚠️ Could not determine vessel number for rope selection`);
		}
	}

	// ========================================
	// INITIALIZATION
	// ========================================
	function initialize() {
		console.log(`🚀 Initializing Vessel Selection Display System:`, {
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href,
		});

		// Clear DOM cache
		clearDomCache();

		// Initialize integration with existing system
		initializeIntegration();

		// Sync with existing selections
		setTimeout(() => {
			syncWithExistingSelections();
		}, 100);

		// Initial display update
		updateSelectionDisplay();

		// Listen for page changes
		window.addEventListener("pageshow", function (event) {
			if (event.persisted) {
				console.log(`🔄 Page restored from cache:`, {
					timestamp: new Date().toISOString(),
				});
				clearDomCache();
				syncWithExistingSelections();
				updateSelectionDisplay();
			}
		});
	}

	// ========================================
	// SYNC WITH EXISTING SYSTEM
	// ========================================
	function syncWithExistingSelections() {
		console.log(`🔄 Syncing with existing selections:`, {
			pomcSystemAvailable: !!(window.pomcSystem),
			timestamp: new Date().toISOString(),
		});

		// Try to sync with POMC system if available
		if (window.pomcSystem && window.pomcSystem.getAllVesselSelections) {
			const pomcSelections = window.pomcSystem.getAllVesselSelections();
			console.log(`📊 POMC System Selections:`, pomcSelections);
			
			Object.keys(pomcSelections).forEach(vesselNum => {
				const selection = pomcSelections[vesselNum];
				if (selection.woodType || selection.ropeType) {
					displayState.vesselSelections[vesselNum] = {
						woodType: selection.woodType,
						ropeType: selection.ropeType,
					};
					console.log(`✅ Synced vessel ${vesselNum}:`, {
						woodType: selection.woodType,
						ropeType: selection.ropeType,
					});
				}
			});
			updateSelectionDisplay();
		} else {
			console.log(`⚠️ POMC System not available for sync`);
		}

		// Try to sync with current vessel count
		if (window.pomcSystem && window.pomcSystem.getSelectedProductAmount) {
			const vesselCount = window.pomcSystem.getSelectedProductAmount();
			if (vesselCount) {
				console.log(`🔢 Synced vessel count:`, {
					previous: displayState.currentVesselCount,
					new: vesselCount,
				});
				displayState.currentVesselCount = vesselCount;
			}
		}
	}

	// ========================================
	// PUBLIC API
	// ========================================
	window.vesselSelectionDisplay = {
		trackVesselSelection: trackVesselSelection,
		updateVesselCount: updateVesselCount,
		updateSelectionDisplay: updateSelectionDisplay,
		getVesselSelections: () => ({ ...displayState.vesselSelections }),
		clearSelections: function () {
			displayState.vesselSelections = {};
			displayState.imageCache.clear();
			updateSelectionDisplay();
		},
		syncWithExistingSelections: syncWithExistingSelections,
		// Debug functions
		getDisplayState: () => ({ ...displayState }),
		debug: function() {
			console.log("🔍 Vessel Selection Display Debug Info:", {
				displayState: displayState,
				domElements: {
					selectionWrap: document.querySelector(".selection-result-wrap"),
					noSelectionText: document.querySelector(".no-selection-text"),
				},
				pomcSystemAvailable: !!(window.pomcSystem),
				timestamp: new Date().toISOString(),
			});
		},
		// Comprehensive logging function
		logSelections: function() {
			console.log("📋 Current Vessel Selections:", {
				vesselCount: displayState.currentVesselCount,
				selections: displayState.vesselSelections,
				imageCache: {
					size: displayState.imageCache.size,
					keys: Array.from(displayState.imageCache.keys()),
				},
				domCache: {
					size: displayState.domCache.size,
					keys: Array.from(displayState.domCache.keys()),
				},
				timestamp: new Date().toISOString(),
			});
		},
		// Log all events
		enableVerboseLogging: function() {
			console.log("🔊 Verbose logging enabled for vessel selection display");
			window.vesselSelectionDisplayVerbose = true;
		},
		disableVerboseLogging: function() {
			console.log("🔇 Verbose logging disabled for vessel selection display");
			window.vesselSelectionDisplayVerbose = false;
		},
		// Check available images
		checkAvailableImages: function() {
			console.log("🔍 Checking available vessel images...");
			
			const imageCombinations = [
				{ wood: 'dusk', rope: 'natural' },
				{ wood: 'dusk', rope: 'charcoal' },
				{ wood: 'dawn', rope: 'natural' },
				{ wood: 'dawn', rope: 'charcoal' },
				{ wood: 'midnight', rope: 'natural' },
				{ wood: 'midnight', rope: 'charcoal' },
			];

			imageCombinations.forEach(combo => {
				const paths = [
					`/assets/${combo.wood}_${combo.rope}.png`,
					`/assets/${combo.wood}-${combo.rope}.png`,
					`/assets/${combo.wood.toUpperCase()}_${combo.rope.toUpperCase()}.png`,
					`/assets/${combo.wood}_${combo.rope}.jpg`,
					`/assets/${combo.wood}-${combo.rope}.jpg`,
				];

				paths.forEach(path => {
					const img = new Image();
					img.onload = () => console.log(`✅ Found: ${path}`);
					img.onerror = () => console.log(`❌ Missing: ${path}`);
					img.src = path;
				});
			});
		},
		// Test image loading for a specific combination
		testImageLoading: function(woodType, ropeType) {
			console.log(`🧪 Testing image loading for ${woodType} + ${ropeType}`);
			
			const selection = { woodType, ropeType };
			const testImg = document.createElement('img');
			const testResultItem = document.createElement('div');
			
			// Create a test container
			const testContainer = document.createElement('div');
			testContainer.style.position = 'absolute';
			testContainer.style.left = '-9999px';
			testContainer.appendChild(testImg);
			document.body.appendChild(testContainer);
			
			// Test the loading
			loadImageOptimized(testImg, `/assets/${woodType.toLowerCase()}_${ropeType.toLowerCase()}.png`, selection, true, testResultItem);
			
			// Clean up after 5 seconds
			setTimeout(() => {
				document.body.removeChild(testContainer);
			}, 5000);
		},
		// Check Shopify asset URL template
		checkAssetUrlTemplate: function() {
			console.log(`🔍 Checking Shopify Asset URL Template:`, {
				available: !!(window.SHOPIFY_ASSET_URL_TEMPLATE),
				template: window.SHOPIFY_ASSET_URL_TEMPLATE,
				timestamp: new Date().toISOString(),
			});
			
			if (window.SHOPIFY_ASSET_URL_TEMPLATE) {
				// Test a few image URLs
				const testImages = ['dusk_natural.png', 'dawn_charcoal.png', 'midnight_natural.png'];
				testImages.forEach(imageName => {
					const testUrl = window.SHOPIFY_ASSET_URL_TEMPLATE.replace('dusk_natural.png', imageName);
					console.log(`🔗 Generated URL for ${imageName}:`, testUrl);
					
					// Test if the URL works
					const img = new Image();
					img.onload = () => console.log(`✅ URL works: ${testUrl}`);
					img.onerror = () => console.log(`❌ URL failed: ${testUrl}`);
					img.src = testUrl;
				});
			} else {
				console.warn(`⚠️ SHOPIFY_ASSET_URL_TEMPLATE not available - using fallback paths`);
			}
		},
	};

	// ========================================
	// ENTRY POINT
	// ========================================
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}
})();
