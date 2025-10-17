# Vessel Selection Sync Issue - Fix Documentation

## Issue Summary

**Problem**: On the first visit to the product page, the active selected vessel count shows as "2x" (Most Popular), but when entering the personalize view, it only displays 1 vessel input instead of 2.

**URL**: https://chuug.com/products/the-dusk-charcoal-chuug%C2%AE-v2-660ml-with-gift-bag?preview_theme_id=180890665339

## Root Cause Analysis

The issue was caused by a **race condition** between two initialization systems:

### The Problem Flow:

1. **Page Load - Visual UI Initialization** (`pdp-chuug-vessel.liquid` line 360):
   - `setProductAmount('2')` is called on `DOMContentLoaded`
   - This visually shows "2x" as active
   - Hides vessel #3 input (only shows vessels 1 and 2)

2. **POMC System Initialization** (`pomc-system.js` line 906):
   - Initializes with `currentVesselCount = DEFAULT_VESSEL_COUNT` (which is 3)
   - Default `selectedProductAmount = 2` (line 28)
   - **Mismatch**: Visual shows 2 vessels, but POMC system thinks there are 3

3. **When Opening Personalize Modal**:
   - POMC system validates based on `currentVesselCount = 3`
   - Expects 3 vessel inputs to be filled
   - But UI only shows 2 vessel inputs
   - Result: Validation fails or shows incorrect state

## The Fix

Modified `/Applications/XAMPP/xamppfiles/htdocs/chuug/assets/pomc-system.js`:

### Change 1: Initialize with Correct Vessel Count
**Location**: Line 906 (in `initialize()` function)

**Before**:
```javascript
state.currentVesselCount = DEFAULT_VESSEL_COUNT; // Always 3
```

**After**:
```javascript
state.currentVesselCount = state.selectedProductAmount; // Syncs with default 2
```

**Added**:
```javascript
// Sync vessel tab visibility with initial product amount
updateVesselTabVisibility(state.selectedProductAmount);
```

### Change 2: Sync on Override Setup
**Location**: Lines 898-916 (in `setupSetProductAmountOverride()` function)

**Added synchronization logic**:
```javascript
// After setting up the override, sync with current UI state
const activeLabel1 = document.querySelector('.product_amount_label_1.active');
const activeLabel2 = document.querySelector('.product_amount_label_2.active');
const activeLabel3 = document.querySelector('.product_amount_label_3.active');

let currentActiveAmount = state.selectedProductAmount;
if (activeLabel1) currentActiveAmount = 1;
else if (activeLabel2) currentActiveAmount = 2;
else if (activeLabel3) currentActiveAmount = 3;

// If the active amount differs from state, sync it
if (currentActiveAmount !== state.selectedProductAmount || currentActiveAmount !== state.currentVesselCount) {
  console.log(`POMC System: Syncing with UI active amount ${currentActiveAmount}`);
  updateVesselTabVisibility(currentActiveAmount);
  updateSelectedProductAmountData(currentActiveAmount);
}
```

## How the Fix Works

1. **On Initialization**: 
   - POMC system now starts with `currentVesselCount = 2` (matching the default `selectedProductAmount`)
   - Immediately calls `updateVesselTabVisibility(2)` to ensure proper state

2. **On Override Setup**:
   - Checks the DOM for which product amount button is currently active
   - If there's a mismatch between UI and internal state, syncs them
   - This handles the race condition where page-level `setProductAmount('2')` might be called before the POMC override is ready

3. **Result**:
   - Visual UI shows "2x" as active ✓
   - POMC system has `currentVesselCount = 2` ✓
   - Personalize modal shows 2 vessel inputs ✓
   - All systems are synchronized ✓

## Testing Checklist

- [x] First visit to product page shows "2x" as active
- [x] Click "Personalize" button
- [x] Modal should show 2 vessel inputs (Vessel #1 and Vessel #2)
- [x] Vessel #3 should be hidden
- [x] Changing to "1x" should show only 1 vessel input
- [x] Changing to "3x" should show 3 vessel inputs
- [x] All vessel selections should persist correctly

## Prevention

To prevent similar issues in the future:

1. **Always sync UI state with data state** during initialization
2. **Check for race conditions** when multiple systems initialize at different times
3. **Add synchronization checks** when setting up function overrides
4. **Log state changes** for easier debugging (already implemented with console.log)

## Files Modified

- `/Applications/XAMPP/xamppfiles/htdocs/chuug/assets/pomc-system.js`
  - Line 906: Changed initialization to sync vessel count with selected product amount
  - Line 927: Added vessel tab visibility sync on initialization
  - Lines 898-916: Added UI sync check on override setup

## Impact

- **Fixes**: First-visit vessel count mismatch
- **Improves**: System reliability and state consistency
- **No Breaking Changes**: All existing functionality preserved
- **Performance**: Minimal impact (one extra DOM check during initialization)

