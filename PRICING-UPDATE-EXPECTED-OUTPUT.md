# Expected Output: Per-Vessel Engraving Pricing Update

## Current vs. New Behavior

### Current Behavior (Bundle-Level Pricing)
- **Master engraving toggle**: Controls all vessels at once
- **Pricing**: Uses one variant for the entire bundle
- **Issue**: Cannot price individual vessels with different engraving states

### New Behavior (Per-Vessel Pricing)
- **Individual vessel toggles**: Each vessel can have engraving enabled/disabled independently
- **Pricing**: Sum of individual vessel prices based on their specific configuration
- **Benefit**: More granular control and accurate pricing

---

## Variant Index Logic

### Variant Index Mapping
```javascript
// For each vessel:
if (vessel.ropeType === 'charcoal') {
  variantIndex = vessel.engravingEnabled ? 3 : 2;
} else { // natural rope
  variantIndex = vessel.engravingEnabled ? 1 : 0;
}
```

### Detailed Breakdown
| Rope Type | Engraving | Variant Index |
|-----------|-----------|---------------|
| Natural   | ❌ No     | 0             |
| Natural   | ✅ Yes    | 1             |
| Charcoal  | ❌ No     | 2             |
| Charcoal  | ✅ Yes    | 3             |

---

## Pricing Calculation Examples

### Example 1: 2 Vessels - Both Natural, Both with Engraving

**Configuration:**
```
Vessel 1: Natural rope, Engraving toggle ON
Vessel 2: Natural rope, Engraving toggle ON
```

**Calculation:**
```javascript
// Vessel 1
ropeType: 'natural'
engravingEnabled: true
variantIndex: 1
price: £19.99 (from selectedProductAmountData.variants[1].price)

// Vessel 2
ropeType: 'natural'
engravingEnabled: true
variantIndex: 1
price: £19.99 (from selectedProductAmountData.variants[1].price)

// Total
totalPrice = £19.99 + £19.99 = £39.98
```

**Expected Display:**
```
Vessel Pricing:
  Vessel #1: £19.99 (Natural + Engraving)
  Vessel #2: £19.99 (Natural + Engraving)
  
Subtotal: £39.98
Gift Box (if enabled): +£4.00 (£2.00 × 2 vessels)
---
Total: £39.98 (or £43.98 with gift box)
```

---

### Example 2: 2 Vessels - One with Engraving, One without

**Configuration:**
```
Vessel 1: Natural rope, Engraving toggle ON
Vessel 2: Natural rope, Engraving toggle OFF
```

**Calculation:**
```javascript
// Vessel 1
ropeType: 'natural'
engravingEnabled: true
variantIndex: 1
price: £19.99 (from selectedProductAmountData.variants[1].price)

// Vessel 2
ropeType: 'natural'
engravingEnabled: false
variantIndex: 0
price: £17.99 (from selectedProductAmountData.variants[0].price)

// Total
totalPrice = £19.99 + £17.99 = £37.98
```

**Expected Display:**
```
Vessel Pricing:
  Vessel #1: £19.99 (Natural + Engraving)
  Vessel #2: £17.99 (Natural, No Engraving)
  
Subtotal: £37.98
Gift Box (if enabled): +£4.00 (£2.00 × 2 vessels)
---
Total: £37.98 (or £41.98 with gift box)
```

---

### Example 3: 2 Vessels - Mixed Rope Types with Different Engraving

**Configuration:**
```
Vessel 1: Charcoal rope, Engraving toggle ON
Vessel 2: Natural rope, Engraving toggle OFF
```

**Calculation:**
```javascript
// Vessel 1
ropeType: 'charcoal'
engravingEnabled: true
variantIndex: 3
price: £22.99 (from selectedProductAmountData.variants[3].price)

// Vessel 2
ropeType: 'natural'
engravingEnabled: false
variantIndex: 0
price: £17.99 (from selectedProductAmountData.variants[0].price)

// Total
totalPrice = £22.99 + £17.99 = £40.98
```

**Expected Display:**
```
Vessel Pricing:
  Vessel #1: £22.99 (Charcoal + Engraving)
  Vessel #2: £17.99 (Natural, No Engraving)
  
Subtotal: £40.98
Gift Box (if enabled): +£4.00 (£2.00 × 2 vessels)
---
Total: £40.98 (or £44.98 with gift box)
```

---

### Example 4: 3 Vessels - All Charcoal, Mixed Engraving

**Configuration:**
```
Vessel 1: Charcoal rope, Engraving toggle ON
Vessel 2: Charcoal rope, Engraving toggle ON
Vessel 3: Charcoal rope, Engraving toggle OFF
```

**Calculation:**
```javascript
// Vessel 1
ropeType: 'charcoal'
engravingEnabled: true
variantIndex: 3
price: £18.33 (from selectedProductAmountData.variants[3].price / 3)

// Vessel 2
ropeType: 'charcoal'
engravingEnabled: true
variantIndex: 3
price: £18.33 (from selectedProductAmountData.variants[3].price / 3)

// Vessel 3
ropeType: 'charcoal'
engravingEnabled: false
variantIndex: 2
price: £16.66 (from selectedProductAmountData.variants[2].price / 3)

// Total
totalPrice = £18.33 + £18.33 + £16.66 = £53.32
```

**Expected Display:**
```
Vessel Pricing:
  Vessel #1: £18.33 (Charcoal + Engraving)
  Vessel #2: £18.33 (Charcoal + Engraving)
  Vessel #3: £16.66 (Charcoal, No Engraving)
  
Subtotal: £53.32
Gift Box (if enabled): +£6.00 (£2.00 × 3 vessels)
---
Total: £53.32 (or £59.32 with gift box)
```

---

## Implementation Requirements

### 1. New Method: `getPerVesselPricing()`

**Purpose**: Calculate pricing for each vessel individually based on its configuration

**Input:**
- Vessel selections from POMC system
- Individual vessel engraving toggle states
- Selected product amount data (variants)

**Output:**
```javascript
{
  vessels: [
    {
      vesselId: 1,
      ropeType: 'charcoal',
      engravingEnabled: true,
      variantIndex: 3,
      price: 2299,        // in cents
      originalPrice: 2899  // in cents
    },
    {
      vesselId: 2,
      ropeType: 'natural',
      engravingEnabled: false,
      variantIndex: 0,
      price: 1799,
      originalPrice: 2199
    }
  ],
  totalPrice: 4098,         // sum of all vessel prices
  totalOriginalPrice: 5098,  // sum of all vessel original prices
  savings: 1000
}
```

### 2. Updated Method: `calculateTotal()`

**Changes:**
```javascript
// OLD: Bundle-level pricing
const vesselPricing = this.getVesselPricingForMultiplier();
total = vesselPricing.price;

// NEW: Per-vessel pricing
const perVesselPricing = this.getPerVesselPricing();
total = perVesselPricing.totalPrice;
```

### 3. Vessel Toggle State Tracking

**State Structure:**
```javascript
this.state = {
  engraving: {
    enabled: true,  // Master toggle (backward compatibility)
    vessels: {
      1: { text: "ABC", enabled: true },
      2: { text: "XYZ", enabled: true },
      3: { text: "", enabled: false }
    }
  }
}
```

### 4. UI Updates

**Vessel Row Toggle Handler:**
```javascript
handleVesselToggleChange(vesselId, enabled) {
  // Update vessel-specific engraving state
  this.state.updateVesselEngravingEnabled(vesselId, enabled);
  
  // Recalculate pricing with per-vessel logic
  this.calculatePricing();
}
```

---

## Price Display Updates

### Current Display
```
Subtotal: £39.98
Save: £10.00
```

### New Display (with breakdown option)
```
Vessel Pricing:
  • 2 vessels with engraving
  • 1 vessel without engraving

Subtotal: £37.98
Save: £8.00

[Show Details ▼]
  Vessel #1: £19.99 (Natural + Engraving)
  Vessel #2: £17.99 (Natural)
  Vessel #3: £0.00 (Not configured)
```

---

## Edge Cases to Handle

### 1. Master Toggle Override
**Scenario**: User disables master engraving toggle
**Behavior**: All vessel toggles should be disabled, all vessels priced without engraving

### 2. No Vessels Configured
**Scenario**: User hasn't selected any vessel configurations yet
**Behavior**: Show default pricing or "Configure vessels to see pricing"

### 3. Partial Configuration
**Scenario**: Only 2 vessels configured, multiplier is 3
**Behavior**: Only price the configured vessels

### 4. Toggle State Persistence
**Scenario**: User reloads page
**Behavior**: Vessel-specific toggle states should be restored from localStorage

---

## Console Debug Output

### Expected Console Logs
```javascript
🔧 Per-vessel pricing calculation started
📊 Processing vessel 1:
  - Rope Type: charcoal
  - Engraving: true
  - Variant Index: 3
  - Price: 2299 cents

📊 Processing vessel 2:
  - Rope Type: natural
  - Engraving: false
  - Variant Index: 0
  - Price: 1799 cents

💰 Total Calculation:
  - Vessel Subtotal: 4098 cents (£40.98)
  - Gift Box: 400 cents (£4.00)
  - Final Total: 4498 cents (£44.98)
  - Savings: 1000 cents (£10.00)
```

---

## Testing Scenarios

### Test Case 1: All Toggles ON
- ✅ All vessels show engraving pricing
- ✅ Total matches sum of all individual prices with engraving

### Test Case 2: All Toggles OFF
- ✅ All vessels show base pricing
- ✅ Total matches sum of all individual prices without engraving

### Test Case 3: Mixed Toggles
- ✅ Each vessel priced according to its toggle state
- ✅ Total is accurate sum of mixed prices

### Test Case 4: Toggle Change During Session
- ✅ Price updates immediately on toggle change
- ✅ No page reload required

### Test Case 5: With Gift Box
- ✅ Gift box pricing multiplies by active vessel count
- ✅ Gift box pricing is independent of engraving state

### Test Case 6: State Persistence
- ✅ Reload page maintains vessel toggle states
- ✅ localStorage correctly saves/restores per-vessel states

---

## Summary of Changes

### Files to Modify
1. `assets/mini-atc-modal.js`
   - Add `getPerVesselPricing()` method
   - Update `calculateTotal()` to use per-vessel pricing
   - Update vessel toggle handler
   - Update state structure

2. `snippets/mini-atc-modal-complete.liquid`
   - Ensure vessel toggle attributes are correct
   - Update for dynamic vessel count (2 or 3)

3. `assets/mini-atc-modal.css`
   - Add styles for price breakdown display (optional)

### Backward Compatibility
- Master engraving toggle still works (disables all vessels)
- Bundle-level pricing maintained as fallback
- No breaking changes to existing cart integration

### Performance Considerations
- Per-vessel calculation is O(n) where n = vessel count (max 3)
- Minimal performance impact
- Cache variant data to avoid repeated lookups

---

## Implementation Priority

1. **High Priority**
   - Core per-vessel pricing logic
   - Variant index calculation per vessel
   - Total price summation

2. **Medium Priority**
   - Vessel toggle state management
   - UI price updates
   - Console debug logging

3. **Low Priority**
   - Price breakdown display in UI
   - Advanced state persistence
   - Animation/transitions

---

*This document outlines the expected behavior before implementation. Review and approve before proceeding with code changes.*

