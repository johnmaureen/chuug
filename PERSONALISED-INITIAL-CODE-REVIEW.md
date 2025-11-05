# PERSONALISED INITIAL - Code Review

## Overview
This document reviews all code that handles the "PERSONALISED INITIAL" property across the codebase. This property is used to store personalization/engraving data for products.

---

## Files Containing PERSONALISED INITIAL

### 1. **assets/mini-atc-modal.js**

#### Location: Lines 3443-3460
**Purpose**: Sets PERSONALISED INITIAL property when adding vessels to cart via mini ATC modal

**Code Analysis**:
```javascript
// Add personalization - use PERSONALISED INITIAL format
const vesselEngravingData = state.engraving?.vessels?.[vesselNumber] || "";
const vesselEngraving = this.getVesselEngravingText(vesselEngravingData);

// Always set PERSONALISED INITIAL property
if (
    engravingEnabled &&
    vesselEngraving &&
    vesselEngraving.trim() !== ""
) {
    properties["PERSONALISED INITIAL"] = vesselEngraving
        .trim()
        .toUpperCase();
} else {
    // Set to "NONE" when engraving is off or no engraving text
    properties["PERSONALISED INITIAL"] = "NONE";
}
```

**Issues Found**:
- ✅ Good: Always sets the property (either value or "NONE")
- ✅ Good: Trims and uppercases the input
- ✅ Good: Handles empty strings properly
- ⚠️ **Potential Issue**: No validation on character length or allowed characters

#### Location: Line 4854
**Purpose**: Displays PERSONALISED INITIAL in checkout view

**Code Analysis**:
```javascript
if (
    key.includes("Engraving") ||
    key.includes("PERSONALISED INITIAL")
) {
    engravingText = value;
}
```

**Issues Found**:
- ✅ Good: Flexible matching (handles both "Engraving" and "PERSONALISED INITIAL")
- ⚠️ **Potential Issue**: Using `includes()` could match unintended keys (e.g., "NOT_PERSONALISED_INITIAL")

#### Helper Method: getVesselEngravingText() (Line 2504)
**Purpose**: Extracts engraving text from vessel data

**Code Analysis**:
```javascript
getVesselEngravingText(vesselData) {
    if (!vesselData) return "";
    if (typeof vesselData === "string") return vesselData;
    if (typeof vesselData === "object" && vesselData.text)
        return vesselData.text;
    return "";
}
```

**Issues Found**:
- ✅ Good: Handles both string and object formats (backward compatibility)
- ✅ Good: Safe null/undefined handling

---

### 2. **snippets/product-variant-picker.liquid**

#### Location: Lines 124-132
**Purpose**: Renders input field for PERSONALISED INITIAL when variant contains "Personalised"

**Code Analysis**:
```liquid
{% if product.selected_or_first_available_variant.title contains 'Personalised' %}
  {%- form 'product', product, id: product_form_installment_id -%}
    <p class="line-item-property__field">
      <label class="form__label" for="monogram-initials">
        PERSONALISED INITIAL (Max 1 Characters, text and numbers only)
        <span style="color:red;">*</span>
      </label>
      <input 
        id="monogram" 
        form="{{ product_form_id }}" 
        style="padding-top: 8px;padding-right: 10px;border: 1px solid;background-color: white;" 
        required 
        class="required search__input field__input" 
        maxlength="3" 
        minlength="3" 
        id="monogram-initials" 
        type="text" 
        name="properties[PERSONALISED INITIAL]" 
        oninput="lettersOnly(this)"
      >
    </p>
  {% endform %}
{% endif %}
```

**Critical Issues Found**:
- ❌ **CRITICAL BUG**: Label says "Max 1 Characters" but `maxlength="3"` and `minlength="3"` are set
- ❌ **CRITICAL BUG**: Label says "text and numbers only" but `oninput="lettersOnly(this)"` only allows letters
- ❌ **CRITICAL BUG**: Duplicate `id` attribute: both `id="monogram"` and `id="monogram-initials"` are set
- ⚠️ **Issue**: Inline styles should be moved to CSS classes
- ⚠️ **Issue**: Form has `id="product_form_installment_id"` but input uses `form="{{ product_form_id }}"` - potential mismatch

#### Location: Line 140
**Purpose**: Error message display

**Code Analysis**:
```liquid
<span id="msgShow" class="hid" style="color:red;font-size:12px;">
  Please add Personalised Initial
</span>
```

**Issues Found**:
- ⚠️ **Issue**: Inline styles should be in CSS
- ✅ Good: Uses semantic error message

---

### 3. **sections/pdp-chuug-vessel.liquid**

#### Location: Lines 378-386
**Purpose**: Input field for PERSONALISED INITIAL in vessel product page

**Code Analysis**:
```liquid
<input
  class="monogram_initials tw-hidden tw-w-full tw-h-[4.8rem] tw-text-center input tw-uppercase tw-bg-chuug-rackley tw-mx-auto tw-rounded-2xl tw-px-4 tw-py-2 tw-border tw-border-white tw-appearance-none tw-placeholder-white hover:tw-cursor-pointer focus:tw-outline-none focus:tw-ring-0 active:tw-outline-none active:tw-ring-0 md:tw-w-1/3 lg:!tw-w-[15.5rem] xl:!tw-w-[18.5rem]"
  type="text"
  maxlength="1"
  placeholder="ENTER Initial"
  name="properties[PERSONALISED INITIAL]"
  disabled
  autocapitalize="characters"
/>
```

**Issues Found**:
- ✅ Good: `maxlength="1"` matches "1 character" requirement
- ✅ Good: Uses `autocapitalize="characters"` for uppercase
- ⚠️ **Issue**: Input is `disabled` by default - ensure it's enabled when needed
- ✅ Good: Uses Tailwind classes for styling

#### Location: Lines 915-923
**Purpose**: Adds PERSONALISED INITIAL to cart when adding products

**Code Analysis**:
```javascript
for (let i = 0; i < product_amount; i++) {
  const initials = monogram_initials[i] && monogram_initials[i].trim() !== '' 
    ? monogram_initials[i].trim() 
    : 'NONE';

  const product = {
    id: initials === 'NONE' ? variant_ids[i].variant_id : variant_ids[i].variant_monogram_initials_id,
    quantity: 1,
    properties: {
      "PERSONALISED INITIAL": initials
    }
  };

  products.push(product);
}
```

**Issues Found**:
- ✅ Good: Defaults to 'NONE' when empty
- ✅ Good: Trims whitespace
- ⚠️ **Issue**: No validation on character length or allowed characters
- ⚠️ **Issue**: No uppercase conversion (may be inconsistent with other implementations)

---

### 4. **sections/main-cart-footer.liquid**

#### Location: Lines 316-330
**Purpose**: Cart patch script - ensures all items have PERSONALISED INITIAL property

**Code Analysis**:
```javascript
const needsFix = cart.items.some(item =>
  !item.properties || !item.properties["PERSONALISED INITIAL"]
);

if (!needsFix) {
  return;
}

const rebuiltItems = cart.items.map(item => ({
  id: item.variant_id,
  quantity: item.quantity,
  properties: {
    ...(item.properties || {}),
    "PERSONALISED INITIAL": item.properties && item.properties["PERSONALISED INITIAL"] 
      ? item.properties["PERSONALISED INITIAL"] 
      : "NONE"
  }
}));
```

**Issues Found**:
- ✅ Good: Backward compatibility patch for old cart items
- ✅ Good: Only runs once per session
- ✅ Good: Preserves existing properties
- ⚠️ **Issue**: Uses "NONE" as default (consistent with mini-atc-modal.js)

#### Location: Lines 356-361
**Purpose**: Sets PERSONALISED INITIAL to "N/A" for upsell products

**Code Analysis**:
```javascript
// PERSONALISED INITIAL = N/A to the upsell product
if (event.detail && typeof event.detail === 'object') {
  event.detail.properties = {
    ...(event.detail.properties || {}),
    "PERSONALISED INITIAL": "N/A"
  };
}
```

**Issues Found**:
- ✅ Good: Distinguishes upsell products from regular products
- ⚠️ **Issue**: Uses "N/A" instead of "NONE" - potential inconsistency with other code

---

### 5. **sections/main-cart-footer-hulkapps-backup.liquid**

#### Location: Lines 291-304
**Purpose**: Same cart patch script as main-cart-footer.liquid (backup version)

**Code Analysis**:
```javascript
const needsFix = cart.items.some(item =>
  !item.properties || !item.properties["PERSONALISED INITIAL"]
);

const rebuiltItems = cart.items.map(item => ({
  id: item.variant_id,
  quantity: item.quantity,
  properties: {
    ...(item.properties || {}),
    "PERSONALISED INITIAL": item.properties && item.properties["PERSONALISED INITIAL"] 
      ? item.properties["PERSONALISED INITIAL"] 
      : "N/A"  // ⚠️ DIFFERENT: Uses "N/A" instead of "NONE"
  }
}));
```

**Issues Found**:
- ⚠️ **Critical Issue**: Uses "N/A" as default instead of "NONE" - **INCONSISTENCY** with main-cart-footer.liquid
- ⚠️ **Issue**: This is a backup file - should be removed or kept in sync

#### Location: Lines 330-335
**Purpose**: Same upsell handler as main-cart-footer.liquid

**Issues Found**:
- ✅ Consistent with main-cart-footer.liquid

---

### 6. **assets/global.js**

#### Location: Lines 985-990
**Purpose**: Dynamically renders PERSONALISED INITIAL input when variant title includes 'Personalised'

**Code Analysis**:
```javascript
if(varTitle.includes('Personalised')){
  mes.innerHTML = `<form><p class="line-item-property__field">
    <label class="form__label" for="monogram-initials">
      PERSONALISED INITIAL (Max 1 Characters, no numbers or symbols)
      <span style="color:red;">*</span>
    </label>
    <input 
      id="monogram" 
      form="product-form-${this.dataset.section}" 
      style="padding-top: 8px;padding-right: 10px;border: 1px solid;background-color: white;" 
      required 
      class="required search__input field__input" 
      maxlength="3" 
      id="monogram-initials" 
      type="text" 
      name="properties[PERSONALISED INITIAL]" 
      oninput="lettersOnly(this)"
    >
  </p></form>`;
}
```

**Critical Issues Found**:
- ❌ **CRITICAL BUG**: Label says "Max 1 Characters" but `maxlength="3"` is set
- ❌ **CRITICAL BUG**: Label says "no numbers or symbols" but `maxlength="3"` allows 3 characters (should be 1)
- ❌ **CRITICAL BUG**: Duplicate `id` attribute: both `id="monogram"` and `id="monogram-initials"`
- ⚠️ **Issue**: Inline styles should be moved to CSS
- ⚠️ **Issue**: Uses `innerHTML` - potential XSS risk if not sanitized
- ⚠️ **Issue**: Different validation message than product-variant-picker.liquid ("no numbers or symbols" vs "text and numbers only")

---

## Summary of Issues

### Critical Bugs
1. **Inconsistent Max Length**: 
   - Labels say "Max 1 Characters" but inputs have `maxlength="3"` in:
     - `snippets/product-variant-picker.liquid` (line 129)
     - `assets/global.js` (line 989)
   - `sections/pdp-chuug-vessel.liquid` correctly uses `maxlength="1"`

2. **Duplicate ID Attributes**: 
   - Both `id="monogram"` and `id="monogram-initials"` in:
     - `snippets/product-variant-picker.liquid` (line 129)
     - `assets/global.js` (line 989)

3. **Inconsistent Validation Messages**: 
   - `product-variant-picker.liquid`: "text and numbers only"
   - `global.js`: "no numbers or symbols"
   - Both use `lettersOnly()` which only allows letters

4. **Default Value Inconsistency**: 
   - `main-cart-footer.liquid` uses "NONE"
   - `main-cart-footer-hulkapps-backup.liquid` uses "N/A"
   - Upsell products use "N/A"

### Minor Issues
1. **No Input Validation**: Most implementations don't validate character length or allowed characters before adding to cart
2. **Inconsistent Uppercasing**: Some code uppercases input, others don't
3. **Inline Styles**: Multiple files use inline styles instead of CSS classes
4. **Backup File**: `main-cart-footer-hulkapps-backup.liquid` has different behavior than main file

---

## Recommendations

### High Priority
1. **Fix maxlength inconsistency**: Decide on 1 or 3 characters and update all files accordingly
2. **Fix duplicate IDs**: Remove duplicate `id` attributes
3. **Standardize default values**: Use either "NONE" or "N/A" consistently across all files
4. **Standardize validation messages**: Make all validation messages consistent

### Medium Priority
5. **Add input validation**: Validate character length and allowed characters before adding to cart
6. **Standardize uppercasing**: Ensure all implementations uppercase the input consistently
7. **Remove or sync backup file**: Either remove `main-cart-footer-hulkapps-backup.liquid` or ensure it matches main file

### Low Priority
8. **Refactor inline styles**: Move inline styles to CSS classes
9. **Sanitize innerHTML**: Use safer DOM manipulation methods instead of `innerHTML`

---

## Files Requiring Action

| File | Priority | Action Required |
|------|----------|----------------|
| `snippets/product-variant-picker.liquid` | High | Fix maxlength, duplicate IDs, validation message |
| `assets/global.js` | High | Fix maxlength, duplicate IDs, validation message |
| `sections/main-cart-footer-hulkapps-backup.liquid` | High | Sync with main file or remove |
| `sections/pdp-chuug-vessel.liquid` | Medium | Add input validation, ensure uppercase |
| `assets/mini-atc-modal.js` | Medium | Add input validation |
| `sections/main-cart-footer.liquid` | Medium | Standardize default value with upsell handler |

---

*Review completed on all code containing "PERSONALISED INITIAL"*

