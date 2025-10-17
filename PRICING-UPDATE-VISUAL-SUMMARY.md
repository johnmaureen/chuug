# Visual Summary: Per-Vessel Engraving Pricing

## Quick Reference: Variant Index Logic

```
┌─────────────────────────────────────────────────────────┐
│          VARIANT INDEX DETERMINATION                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  For EACH Vessel:                                       │
│                                                          │
│  ┌──────────────┐                                       │
│  │ Rope Type?   │                                       │
│  └──────┬───────┘                                       │
│         │                                                │
│    ┌────┴────┐                                          │
│    │         │                                          │
│ NATURAL   CHARCOAL                                      │
│    │         │                                          │
│    │         │                                          │
│    ▼         ▼                                          │
│ ┌─────┐  ┌─────┐                                       │
│ │Engr?│  │Engr?│                                       │
│ └──┬──┘  └──┬──┘                                       │
│    │        │                                           │
│  ┌─┴─┐    ┌─┴─┐                                        │
│  NO YES    NO YES                                       │
│  │   │    │   │                                         │
│  ▼   ▼    ▼   ▼                                         │
│  0   1    2   3    ← Variant Index                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Before & After Comparison

### BEFORE (Bundle-Level Pricing)

```
┌───────────────────────────────────────┐
│  🎯 Master Engraving Toggle: ON       │
│     [All vessels use same pricing]    │
└───────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Variant: 3   │ ← Single variant for all
         │  £39.98       │
         └───────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Total Price  │
         │    £39.98     │
         └───────────────┘
```

### AFTER (Per-Vessel Pricing)

```
┌─────────────────────────────────────────────┐
│  🎯 Master Toggle: ON                       │
│     [Individual vessel toggles active]      │
└─────────────────────────────────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Vessel 1 │   │ Vessel 2 │   │ Vessel 3 │
   │ Toggle:✅│   │ Toggle:✅│   │ Toggle:❌│
   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │
        ▼              ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │Variant: 3│   │Variant: 3│   │Variant: 2│
   │ £19.99   │   │ £19.99   │   │ £17.99   │
   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │
        └──────┬───────┴──────┬───────┘
               ▼              
         ┌──────────────┐
         │ Sum Prices   │
         │   £57.97     │
         └──────────────┘
```

## Pricing Flow Diagram

```
START: User Opens Mini ATC Modal
    │
    ▼
[Get Vessel Count from POMC]
    │ (multiplier: 1, 2, or 3)
    ▼
┌──────────────────────────┐
│  FOR EACH Active Vessel  │
│  (1 to multiplier)       │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Get Vessel Configuration    │
│ - ropeType (POMC system)    │
│ - engravingEnabled (toggle) │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Calculate Variant Index     │
│                             │
│ if (charcoal) {             │
│   idx = engraving ? 3 : 2   │
│ } else {                    │
│   idx = engraving ? 1 : 0   │
│ }                           │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Get Variant from Product    │
│ Data at calculated index    │
│                             │
│ variant =                   │
│   productData.variants[idx] │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Extract Pricing             │
│ - price (in cents)          │
│ - compare_at_price          │
└────────┬────────────────────┘
         │
         ▼
    [LOOP NEXT VESSEL]
         │
         ▼
┌─────────────────────────────┐
│ Sum All Vessel Prices       │
│                             │
│ totalPrice = Σ vessel.price │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Add Gift Box (if enabled)   │
│                             │
│ giftBoxTotal =              │
│   price × vesselCount       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Calculate Final Total       │
│                             │
│ finalTotal =                │
│   totalPrice + giftBoxTotal │
└────────┬────────────────────┘
         │
         ▼
    [UPDATE UI DISPLAY]
         │
         ▼
       END
```

## Example Scenario Walkthrough

### Scenario: 2 Vessels, Mixed Configuration

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Initial Configuration                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Vessel 1:  🪵 Charcoal Rope                            │
│             ✅ Engraving Toggle ON                       │
│             📝 "ABC"                                     │
│                                                          │
│  Vessel 2:  🪵 Natural Rope                             │
│             ❌ Engraving Toggle OFF                      │
│             📝 ""                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STEP 2: Variant Index Calculation                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Vessel 1:                                              │
│    ropeType = "charcoal"                                │
│    engravingEnabled = true                              │
│    → variantIndex = 3                                   │
│                                                          │
│  Vessel 2:                                              │
│    ropeType = "natural"                                 │
│    engravingEnabled = false                             │
│    → variantIndex = 0                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STEP 3: Price Lookup                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Vessel 1 (Index 3):                                    │
│    variants[3].price = 2299 (£22.99)                   │
│    variants[3].compare_at_price = 2899 (£28.99)        │
│                                                          │
│  Vessel 2 (Index 0):                                    │
│    variants[0].price = 1799 (£17.99)                   │
│    variants[0].compare_at_price = 2199 (£21.99)        │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STEP 4: Price Summation                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Vessel Subtotal:                                       │
│    2299 + 1799 = 4098 cents (£40.98)                   │
│                                                          │
│  Original Price:                                        │
│    2899 + 2199 = 5098 cents (£50.98)                   │
│                                                          │
│  Savings:                                               │
│    5098 - 4098 = 1000 cents (£10.00)                   │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STEP 5: Add Gift Box (if enabled)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Gift Box Enabled: YES ✅                               │
│  Gift Box Price: 200 cents (£2.00) per vessel          │
│  Vessel Count: 2                                        │
│                                                          │
│  Gift Box Total:                                        │
│    200 × 2 = 400 cents (£4.00)                         │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STEP 6: Final Total                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Vessel Subtotal:     £40.98                            │
│  Gift Box:          + £ 4.00                            │
│  ─────────────────────────                              │
│  Total:               £44.98                            │
│                                                          │
│  You Save:            £10.00                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## State Structure

### Current State
```javascript
{
  engraving: {
    enabled: true,
    vessels: {
      1: "ABC",
      2: "XYZ"
    }
  }
}
```

### New State (with per-vessel toggle)
```javascript
{
  engraving: {
    enabled: true,  // Master toggle
    vessels: {
      1: {
        text: "ABC",
        enabled: true   // ← NEW: Per-vessel toggle
      },
      2: {
        text: "XYZ",
        enabled: false  // ← NEW: Per-vessel toggle
      }
    }
  }
}
```

## UI Toggle Behavior

```
Master Toggle: ON
┌────────────────────────────────────────┐
│  ✅ Add Coin Engraving                 │
├────────────────────────────────────────┤
│                                        │
│  Vessel #1  [ON] ✅  [ABC_____]       │
│                                        │
│  Vessel #2  [ON] ✅  [XYZ_____]       │
│                                        │
└────────────────────────────────────────┘
         ↓ User disables Vessel #2
┌────────────────────────────────────────┐
│  ✅ Add Coin Engraving                 │
├────────────────────────────────────────┤
│                                        │
│  Vessel #1  [ON] ✅  [ABC_____]       │
│                     £19.99 + engraving │
│                                        │
│  Vessel #2  [OFF] ❌  [_______]       │
│                     £17.99 no engraving│
│                                        │
└────────────────────────────────────────┘
```

## Code Flow

```javascript
// 1. User toggles vessel engraving
handleVesselToggleChange(vesselId=2, enabled=false)
    │
    ▼
// 2. Update state
state.updateVesselEngravingEnabled(2, false)
    │
    ▼
// 3. Trigger pricing recalculation
calculatePricing()
    │
    ▼
// 4. Get per-vessel pricing
getPerVesselPricing()
    │
    ├─→ For Vessel 1:
    │     ropeType = "natural"
    │     engravingEnabled = true
    │     variantIndex = 1
    │     price = £19.99
    │
    └─→ For Vessel 2:
          ropeType = "natural"
          engravingEnabled = false
          variantIndex = 0
          price = £17.99
    │
    ▼
// 5. Sum prices
totalPrice = £19.99 + £17.99 = £37.98
    │
    ▼
// 6. Update UI display
updatePricingDisplay({
  total: 3798,
  originalPrice: 4398,
  savings: 600
})
```

## Key Implementation Points

### ✅ DO's
1. ✅ Get vessel count from `window.pomcSystem.getMultiplier()`
2. ✅ Get rope type from `window.pomcSystem.getAllVesselSelections()[vesselId]`
3. ✅ Get engraving state from vessel-specific toggle
4. ✅ Calculate variant index per vessel independently
5. ✅ Sum all individual vessel prices
6. ✅ Handle missing vessel configurations gracefully

### ❌ DON'Ts
1. ❌ Don't use bundle-level variant index
2. ❌ Don't assume all vessels have same configuration
3. ❌ Don't forget to check if vessel is configured
4. ❌ Don't hard-code vessel count (use multiplier)
5. ❌ Don't ignore vessel toggle state
6. ❌ Don't break backward compatibility

## Testing Matrix

| Vessels | Rope Types | Engraving States | Expected Result |
|---------|-----------|------------------|-----------------|
| 2 | Both Natural | Both ON | 2 × Variant[1] |
| 2 | Both Natural | Both OFF | 2 × Variant[0] |
| 2 | Both Natural | Mixed (ON/OFF) | Variant[1] + Variant[0] |
| 2 | Both Charcoal | Both ON | 2 × Variant[3] |
| 2 | Both Charcoal | Both OFF | 2 × Variant[2] |
| 2 | Mixed (C/N) | Both ON | Variant[3] + Variant[1] |
| 2 | Mixed (C/N) | Both OFF | Variant[2] + Variant[0] |
| 2 | Mixed (C/N) | Mixed (ON/OFF) | Variant[3] + Variant[0] |
| 3 | All Natural | All ON | 3 × Variant[1] |
| 3 | All Natural | Mixed (2 ON, 1 OFF) | 2×Variant[1] + Variant[0] |

---

**Next Step**: Review this visual summary and approve before implementation.


