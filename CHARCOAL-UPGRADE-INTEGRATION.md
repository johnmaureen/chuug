# Charcoal Rope Upgrade Integration Guide

## Overview
This guide explains how the charcoal rope upgrade pricing system has been integrated and what steps are needed to make it work in production.

## What Was Implemented

### 1. **Price Calculation & Display** (✅ Complete)
- **File**: `assets/pomc-system.js`
- Calculates $2.99 upgrade per vessel with charcoal rope
- Dispatches events when rope selections change
- Provides public API methods:
  - `window.pomcSystem.getCharcoalUpgradePrice()` - Returns price in cents
  - `window.pomcSystem.getCharcoalUpgradePriceFormatted()` - Returns formatted string

### 2. **UI Price Updates** (✅ Complete)
- **File**: `sections/pdp-chuug-vessel.liquid`
- Listens for charcoal upgrade events
- Updates all `.dualPrice` elements automatically when charcoal is selected
- Updates when product amount or engraving changes

### 3. **Cart Integration** (✅ Complete)
- **File**: `assets/mini-atc-modal.js`
- Adds charcoal upgrade as separate line item (like gift box)
- One upgrade item per vessel with charcoal rope
- Includes in order notes and cart summary

### 4. **Configuration Setup** (✅ Complete)
- **File**: `snippets/mini-atc-modal-complete.liquid`
- Looks for charcoal upgrade product via Shopify
- Sets global `window.CHARCOAL_UPGRADE_VARIANT_ID`

---

## Required Setup in Shopify

### Step 1: Create Charcoal Rope Upgrade Product

1. **Go to Shopify Admin** → Products → Add Product

2. **Product Details:**
   - **Title**: Charcoal Rope Upgrade
   - **Handle**: `charcoal-rope-upgrade` (CRITICAL - must match exactly!)
   - **Price**: $2.99 USD (or equivalent in your currency)
   - **Description**: Premium charcoal-colored rope upgrade for your CHUUG vessel

3. **Inventory:**
   - Check "Track quantity"
   - Set a high stock number (e.g., 9999) or untrack if it's a digital upgrade

4. **Product Status**: Active

5. **Save the product**

### Step 2: Deploy Updated Files to Shopify

Upload these modified files to your Shopify theme:

1. `assets/pomc-system.js`
2. `assets/mini-atc-modal.js`
3. `sections/pdp-chuug-vessel.liquid`
4. `snippets/mini-atc-modal-complete.liquid`

**Using Shopify CLI:**
```bash
shopify theme push
```

**Or manually:**
- Shopify Admin → Online Store → Themes → Edit Code
- Upload/replace each file

### Step 3: Clear Browser Cache
Hard refresh (Cmd/Ctrl + Shift + R) to load new code

---

## How It Works

### 1. **On Product Page:**
- User selects "Charcoal" rope → Price immediately updates
- Shows base price + ($2.99 × number of charcoal vessels)
- Updates when vessel count changes

### 2. **Adding to Cart:**
When "Add to Cart" is clicked:
1. Main vessel product is added
2. For each vessel with charcoal rope:
   - A "Charcoal Rope Upgrade" line item is added ($2.99)
3. Cart total reflects base + upgrades

### 3. **In Cart/Checkout:**
- Each charcoal upgrade appears as a separate line item
- Linked to its vessel via `_Vessel Number` property
- Order notes include: "X Charcoal Rope Upgrade(s)"

---

## Console Logs to Verify

### On Rope Selection:
```javascript
POMC: Rope selection - Vessel #1, Type: charcoal
POMC: Vessel #1 has charcoal rope
POMC: Charcoal count: 1, Total upgrade: $2.99
POMC: Dispatching charcoal upgrade price event
POMC: Received charcoal upgrade price event in PDP, updating prices...
POMC: Prices updated with charcoal upgrade
```

### On Add to Cart:
```javascript
🔍 Getting charcoal upgrade variant ID...
✅ Found charcoal upgrade variant ID: 12345678
🪢 Charcoal upgrade item for Vessel 1 being added
🪢 Added 1 charcoal rope upgrade(s) to cart
```

---

## Troubleshooting

### Issue: "No charcoal upgrade variant ID found"
**Solution:** 
- Verify product exists with handle `charcoal-rope-upgrade`
- Check product is Active (not Draft)
- Reload the page

### Issue: Prices not updating
**Solution:**
- Hard refresh browser (clear cache)
- Check console for JavaScript errors
- Verify `pomcCharcoalUpgradePrice` event is dispatching

### Issue: Upgrade not added to cart
**Solution:**
- Check console for "No charcoal upgrade variant ID found" message
- Verify `window.CHARCOAL_UPGRADE_VARIANT_ID` is set (check in console)
- Make sure charcoal rope product exists in Shopify

### Issue: Wrong price in cart
**Solution:**
- Verify charcoal upgrade product price is $2.99 in Shopify
- Check that the correct variant ID is being used

---

## Testing Checklist

- [ ] Create "Charcoal Rope Upgrade" product in Shopify
- [ ] Deploy updated files to theme
- [ ] Hard refresh browser
- [ ] Select charcoal rope on Vessel #1
- [ ] Verify price updates on PDP (+$2.99)
- [ ] Select charcoal on Vessel #2
- [ ] Verify price updates (+$5.98 total)
- [ ] Add to cart
- [ ] Check cart has 2 vessels + 2 charcoal upgrades
- [ ] Verify cart total is correct
- [ ] Check order notes mention charcoal upgrades
- [ ] Complete test checkout

---

## API Reference

### POMC System Methods

```javascript
// Get upgrade price in cents
window.pomcSystem.getCharcoalUpgradePrice()
// Returns: 299, 598, 897, etc.

// Get formatted upgrade price
window.pomcSystem.getCharcoalUpgradePriceFormatted()
// Returns: "$2.99", "$5.98", "$8.97", etc.

// Get upgrade price constant
window.pomcSystem.CHARCOAL_UPGRADE_PRICE
// Returns: 299 (cents)
```

### Event Listening

```javascript
document.addEventListener('pomcCharcoalUpgradePrice', function(e) {
  console.log('Upgrade Price:', e.detail.upgradePrice); // 299
  console.log('Formatted:', e.detail.upgradePriceFormatted); // "$2.99"
  console.log('Charcoal Count:', e.detail.charcoalCount); // 1
});
```

---

## Support

If you encounter any issues:
1. Check browser console for error messages
2. Verify all files were uploaded correctly
3. Ensure product handle is exactly `charcoal-rope-upgrade`
4. Check that product price is $2.99

---

**Last Updated:** October 10, 2025

