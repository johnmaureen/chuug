# Duplicate Properties Issue - Simple Report

## What Happened?

Some orders showed **both** "Monogram Initials" and "PERSONALISED INITIAL" properties at the same time. This shouldn't happen - we only need one property name.

## Why Did This Happen?

### The Problem
We recently changed the system to use "PERSONALISED INITIAL" instead of "Monogram Initials" to be more consistent. However, the cleanup script that was supposed to fix old orders had a flaw:

1. **Old Orders**: Some orders were created with the old property name "Monogram Initials"
2. **New Orders**: New orders use the new property name "PERSONALISED INITIAL"  
3. **The Bug**: When orders were updated or modified, sometimes both properties ended up being stored together
4. **The Cleanup Script**: The script that was supposed to remove the old property only ran in certain cases, so it missed items that already had both properties

### Specific Scenarios That Created Duplicates

**Scenario 1: Order Updated After Property Name Change**
- Customer added item with "Monogram Initials" (old system)
- Later, the order was updated and the system added "PERSONALISED INITIAL" (new system)
- The old property wasn't removed, so both existed

**Scenario 2: Migration Script Limitation**
- The cleanup script only fixed items that had neither property
- If an item already had both properties, the script didn't detect it needed fixing
- The duplicate properties remained

## What Was Fixed?

We updated the cleanup script to:

✅ **Detect** items with the old property name (even if the new one also exists)
✅ **Remove** the old "Monogram Initials" property when it's found
✅ **Keep** the new "PERSONALISED INITIAL" property (this is the correct one)
✅ **Migrate** old values to the new property name when needed

## What This Means Going Forward

### For New Orders
- ✅ All new orders will only have "PERSONALISED INITIAL"
- ✅ No duplicates will be created

### For Existing Orders (Before Fix)
- ✅ The cleanup script will automatically fix orders when customers visit the checkout
- ✅ Old "Monogram Initials" properties will be removed
- ✅ Values will be preserved in "PERSONALISED INITIAL"
- ✅ This happens automatically in the background

### Display
- ✅ Checkout will show the correct property name
- ✅ No more duplicate or confusing property displays

## Summary

**Problem**: Some orders had both old and new property names, causing confusion.

**Cause**: The cleanup script didn't catch all cases where both properties existed.

**Solution**: Updated the cleanup script to detect and remove old properties, even when both exist.

**Result**: Orders will now only use the correct "PERSONALISED INITIAL" property going forward, and existing orders will be automatically fixed.

---

*Report Generated: This explains the duplicate properties issue found in orders*
