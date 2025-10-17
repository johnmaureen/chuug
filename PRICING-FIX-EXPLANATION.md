# Pricing Fix: Engraving Cost Calculation

## The Problem 🐛

The original implementation was **overpricing** because it was treating variant prices as per-vessel prices, when they're actually **bundle prices** for all vessels.

### Example of the Bug:
```
Scenario: 2 vessels, both with Natural rope

OLD (INCORRECT) CALCULATION:
Vessel 1: Variant[1].price = £39.98 (full bundle price)
Vessel 2: Variant[1].price = £39.98 (full bundle price)
Total: £79.96 ❌ WRONG! (Should be £39.98)
```

## The Solution ✅

Instead of using full variant prices, we now:
1. **Start with base bundle price** (no engraving variant)
2. **Calculate only the engraving cost difference** per vessel
3. **Add only the engraving charges** for vessels that have engraving enabled

### New Calculation Logic:

```javascript
// Step 1: Get base bundle price (all vessels, NO engraving)
basePrice = variants[0 or 2].price  // Natural or Charcoal, no engraving

// Step 2: Calculate engraving cost per vessel
For each vessel with engraving enabled:
  withEngravingPrice = variants[1 or 3].price
  withoutEngravingPrice = variants[0 or 2].price
  bundleEngravingDiff = withEngravingPrice - withoutEngravingPrice
  perVesselEngravingCost = bundleEngravingDiff / multiplier
  
  engravingCharges += perVesselEngravingCost

// Step 3: Final total
totalPrice = basePrice + engravingCharges
```

## Example: Corrected Calculation

### Scenario 1: Both Vessels with Engraving
```
Setup:
- 2 vessels, both Natural rope
- Both have engraving ON

Calculation:
Base price (Natural, no engraving): £35.98
Engraving difference: £39.98 - £35.98 = £4.00 (for bundle)
Per vessel engraving: £4.00 / 2 = £2.00

Vessel 1 engraving: +£2.00
Vessel 2 engraving: +£2.00

Total: £35.98 + £2.00 + £2.00 = £39.98 ✅ CORRECT!
```

### Scenario 2: Mixed Engraving (1 ON, 1 OFF)
```
Setup:
- 2 vessels, both Natural rope
- Vessel 1: engraving ON
- Vessel 2: engraving OFF

Calculation:
Base price (Natural, no engraving): £35.98
Per vessel engraving cost: £2.00

Vessel 1 engraving: +£2.00
Vessel 2 engraving: +£0.00

Total: £35.98 + £2.00 = £37.98 ✅ CORRECT!
```

### Scenario 3: No Engraving
```
Setup:
- 2 vessels, both Natural rope
- Both have engraving OFF

Calculation:
Base price (Natural, no engraving): £35.98
Engraving charges: £0.00

Total: £35.98 ✅ CORRECT!
```

## Console Output Example

Now you'll see clear pricing breakdown:

```javascript
🔧 Per-vessel pricing calculation started

💰 Base bundle price (no engraving): {
  variantIndex: 0,
  price: 3598,
  priceFormatted: "£35.98"
}

📊 Vessel 1 (Engraving ON): {
  ropeType: "natural",
  withEngravingPrice: 3998,
  withoutEngravingPrice: 3598,
  bundleDifference: 400,
  perVesselCost: 200,
  perVesselCostFormatted: "£2.00"
}

📊 Vessel 2 (Engraving OFF): {
  ropeType: "natural",
  engravingCost: 0
}

💰 Final Calculation: {
  basePrice: 3598,
  engravingCharges: 200,
  totalPrice: 3798,
  totalFormatted: "£37.98"
}
```

## Key Changes

### Before (Wrong):
```javascript
// Used full variant price per vessel
totalPrice += variant.price;  // ❌ This is a bundle price!
```

### After (Correct):
```javascript
// Start with base bundle price
totalPrice = baseVariant.price;

// Add only engraving cost per vessel
const engravingDiff = withEngraving.price - withoutEngraving.price;
const perVesselCost = engravingDiff / multiplier;
totalPrice += perVesselCost;  // ✅ Only the engraving charge!
```

## Why This Works

**Shopify Bundle Variants Structure:**
- Variant 0: Bundle with all vessels, Natural rope, NO engraving
- Variant 1: Bundle with all vessels, Natural rope, WITH engraving
- Variant 2: Bundle with all vessels, Charcoal rope, NO engraving  
- Variant 3: Bundle with all vessels, Charcoal rope, WITH engraving

The price difference between variant 1 and variant 0 is the **total engraving cost for all vessels in the bundle**. We divide by multiplier to get the **per-vessel engraving cost**.

## Testing

Test these scenarios to verify:

1. **All ON**: Price should match variant with engraving
2. **All OFF**: Price should match variant without engraving
3. **Mixed (1 ON, 1 OFF)**: Price should be between the two variants
4. **Mixed (2 ON, 1 OFF)**: Price should add 2/3 of engraving cost

---

**Status**: ✅ Fixed and Ready to Test

