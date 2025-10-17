# Testing Guide: Per-Vessel Engraving Pricing

## Quick Test Instructions

### Test 1: Basic Toggle Functionality
1. Open Mini ATC Modal
2. Locate the coin engraving section
3. You should see toggles for Vessel #1, #2, and #3
4. Toggle Vessel #2 OFF
5. **Expected**: Price should decrease (no engraving charge for Vessel #2)
6. Toggle Vessel #2 back ON
7. **Expected**: Price should increase back to original

### Test 2: Console Verification
1. Open browser DevTools (F12)
2. Go to Console tab
3. Open Mini ATC Modal
4. Toggle any vessel engraving
5. **Expected Console Output**:
```
🔧 Per-vessel pricing calculation started
📊 Vessel 1: {ropeType: "charcoal", engravingEnabled: true, variantIndex: 3, ...}
📊 Vessel 2: {ropeType: "natural", engravingEnabled: false, variantIndex: 0, ...}
💰 Total Calculation: {totalPrice: 4098, totalFormatted: "£40.98"}
```

### Test 3: State Persistence
1. Toggle Vessel #1 OFF
2. Close the modal
3. Reopen the modal
4. **Expected**: Vessel #1 toggle should still be OFF

### Test 4: Master Toggle Override
1. Ensure some vessel toggles are ON
2. Turn OFF the master "Add Coin Engraving" toggle
3. **Expected**: Price should be calculated with NO engraving for any vessel
4. Turn master toggle back ON
5. **Expected**: Individual vessel toggle states should be respected

### Test 5: Mixed Configuration
1. Configure Vessel #1 with Charcoal rope
2. Configure Vessel #2 with Natural rope
3. Enable engraving for Vessel #1 only
4. **Expected**: 
   - Vessel #1 uses variant index 3 (Charcoal + Engraving)
   - Vessel #2 uses variant index 0 (Natural, No Engraving)
   - Total reflects sum of both

## Expected Behavior Matrix

| Master Toggle | Vessel 1 Toggle | Vessel 2 Toggle | Vessel 1 Pricing | Vessel 2 Pricing |
|---------------|-----------------|-----------------|------------------|------------------|
| ON            | ON              | ON              | With Engraving   | With Engraving   |
| ON            | ON              | OFF             | With Engraving   | No Engraving     |
| ON            | OFF             | ON              | No Engraving     | With Engraving   |
| ON            | OFF             | OFF             | No Engraving     | No Engraving     |
| OFF           | ON              | ON              | No Engraving     | No Engraving     |
| OFF           | OFF             | OFF             | No Engraving     | No Engraving     |

## Console Log Checklist

✅ Should see: `🔧 Per-vessel pricing calculation started`
✅ Should see: `📊 Vessel 1:` with details
✅ Should see: `📊 Vessel 2:` with details
✅ Should see: `💰 Total Calculation:` with totals
✅ Variant index should be 0, 1, 2, or 3 (never undefined)
✅ Price should be a number in cents

## Common Issues & Solutions

### Issue: Vessel toggle doesn't affect price
**Check**: Master toggle is ON
**Check**: Vessel has rope type configured in POMC system
**Check**: Console shows variant index changing

### Issue: Price not updating
**Check**: `window.pomcSystem` exists
**Check**: `selectedProductAmountData` has variants array
**Check**: Console for any JavaScript errors

### Issue: State not persisting
**Check**: Browser localStorage is enabled
**Check**: No errors in console about storage
**Check**: `CONFIG.STORAGE_KEY` is defined

## Test Data Examples

### Example 1: Both Natural, Mixed Engraving
```
Vessel 1: Natural + Engraving → Variant 1 → £19.99
Vessel 2: Natural, No Engraving → Variant 0 → £17.99
Total: £37.98
```

### Example 2: Both Charcoal, Both Engraving
```
Vessel 1: Charcoal + Engraving → Variant 3 → £22.99
Vessel 2: Charcoal + Engraving → Variant 3 → £22.99
Total: £45.98
```

### Example 3: Mixed Rope, Mixed Engraving
```
Vessel 1: Charcoal + Engraving → Variant 3 → £22.99
Vessel 2: Natural, No Engraving → Variant 0 → £17.99
Total: £40.98
```

## Success Criteria

✅ Each vessel can be toggled independently
✅ Price updates in real-time
✅ Console logs show correct variant indices
✅ State persists across modal close/open
✅ State persists across page reload
✅ Master toggle overrides all vessel toggles when OFF
✅ No JavaScript errors in console
✅ Gift box pricing still works correctly

---

**Test on multiple scenarios before deploying to production!**

