# MONOGRAM INITIALS - Comprehensive Code Review

This document reviews all code that handles "Monogram Initials" functionality across the codebase. The feature allows customers to personalize products with their initials.

**Review Date**: Generated automatically  
**Scope**: All files using "Monogram Initials" or "PERSONALISED INITIAL"

---

## Executive Summary

### Critical Issues Found
1. **Property Name Inconsistency**: Two different property names are used:
   - `"PERSONALISED INITIAL"` (used in most places)
   - `"Monogram Initials"` (used in mini-atc-modal.js and some display templates)
   
2. **Duplicate ID Attributes**: Multiple elements have duplicate `id` attributes which violates HTML standards

3. **Validation Inconsistencies**: Different character limits and validation rules across different implementations

4. **Missing Input Validation**: Some implementations lack proper validation before adding to cart

---

## Files Reviewed

### 1. **sections/pdp-chuug-vessel.liquid**

#### Location: Lines 378-386
**Purpose**: Input field for monogram initials in vessel product page

**Code**:
```liquid
<input
  class="monogram_initials tw-hidden tw-w-full tw-h-[4.8rem] ..."
  type="text"
  maxlength="1"
  placeholder="ENTER Initial"
  name="properties[PERSONALISED INITIAL]"
  disabled
  autocapitalize="characters"
/>
```

**Issues**:
- ✅ **Good**: `maxlength="1"` enforces single character
- ✅ **Good**: Uses `autocapitalize="characters"` for uppercase
- ⚠️ **Issue**: Input is `disabled` by default - needs JavaScript to enable
- ⚠️ **Issue**: Uses property name `"PERSONALISED INITIAL"` (singular)

#### Location: Lines 788-841
**Purpose**: JavaScript validation for monogram initials input

**Code**:
```javascript
function addEventListenerToMonogramInitialsInput() {
  const fields = document.querySelectorAll('.monogram_initials');
  
  const enforceUppercaseLettersOnly = (el) => {
    const clean = el.value.replace(/[^A-Za-z]/g, '').toUpperCase();
    // ...
  };
  
  fields.forEach((field, i) => {
    if (i >= 3) return;
    
    field.addEventListener('input', () => {
      enforceUppercaseLettersOnly(field);
      updateMonogramInitials();
    });
    
    field.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const insert = text.replace(/[^A-Za-z]/g, '').toUpperCase();
      // ...
    });
  });
}
```

**Issues**:
- ✅ **Good**: Enforces letters-only (removes numbers and symbols)
- ✅ **Good**: Forces uppercase conversion
- ✅ **Good**: Handles paste events properly
- ✅ **Good**: Limits to 3 fields (vessel count)
- ⚠️ **Issue**: No validation on maxlength enforcement during paste

#### Location: Lines 915-923
**Purpose**: Adds monogram initials to cart

**Code**:
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
}
```

**Issues**:
- ✅ **Good**: Defaults to 'NONE' when empty
- ✅ **Good**: Trims whitespace
- ⚠️ **Issue**: No validation that initials match maxlength="1" before adding to cart
- ⚠️ **Issue**: No check if initials contain only letters (though input validation should prevent this)

---

### 2. **snippets/pomc-system.liquid**

#### Location: Lines 449-456
**Purpose**: Input field for monogram initials in POMC system

**Code**:
```liquid
<input
  class="monogram_initials tw-hidden tw-w-full tw-h-[4.8rem] ..."
  type="text"
  maxlength="3"
  placeholder="ENTER Initials"
  name="properties[Monogram Initials]"
  disabled
>
```

**Issues**:
- ❌ **CRITICAL**: Uses different property name `"Monogram Initials"` (plural) instead of `"PERSONALISED INITIAL"` (singular)
- ❌ **CRITICAL**: `maxlength="3"` instead of `"1"` - inconsistent with pdp-chuug-vessel.liquid
- ❌ **CRITICAL**: Placeholder says "ENTER Initials" (plural) but other places expect single character
- ⚠️ **Issue**: No `autocapitalize="characters"` attribute

---

### 3. **snippets/product-variant-picker.liquid**

#### Location: Lines 127-129
**Purpose**: Input field for personalised initial when variant contains "Personalised"

**Code**:
```liquid
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
```

**Issues**:
- ❌ **CRITICAL BUG**: Duplicate `id` attribute - both `id="monogram"` and `id="monogram-initials"` are set on the same element
- ❌ **CRITICAL**: Label says "Max 1 Characters" but `maxlength="3"` and `minlength="3"` - inconsistent
- ❌ **CRITICAL**: Label says "text and numbers only" but `oninput="lettersOnly(this)"` suggests only letters
- ⚠️ **Issue**: Inline styles should be moved to CSS
- ⚠️ **Issue**: Uses `lettersOnly()` function which may not be defined

---

### 4. **assets/global.js**

#### Location: Lines 986-990
**Purpose**: Dynamically renders PERSONALISED INITIAL input when variant title includes 'Personalised'

**Code**:
```javascript
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
```

**Issues**:
- ❌ **CRITICAL BUG**: Duplicate `id` attribute - both `id="monogram"` and `id="monogram-initials"`
- ❌ **CRITICAL**: Label says "Max 1 Characters" but `maxlength="3"` - inconsistent
- ⚠️ **Issue**: Label says "no numbers or symbols" but `lettersOnly()` function may not exist
- ⚠️ **Issue**: Inline styles should be in CSS

---

### 5. **assets/mini-atc-modal.js**

#### Location: Lines 3650-3669
**Purpose**: Collects all vessel engravings and sets "Monogram Initials" property

**Code**:
```javascript
// Add Monogram Initials (visible on checkout) - collect all vessel engravings
const allEngravings = [];
for (let i = 1; i <= multiplier; i++) {
  const vesselEngravingData = state.engraving?.vessels?.[i] || "";
  const vesselEngraving = this.getVesselEngravingText(vesselEngravingData);
  if (
    engravingEnabled &&
    vesselEngraving &&
    vesselEngraving.trim() !== ""
  ) {
    allEngravings.push(vesselEngraving.trim().toUpperCase());
  }
}

if (allEngravings.length > 0) {
  properties["Monogram Initials"] = allEngravings.join(", ");
} else {
  properties["Monogram Initials"] = "N/A";
}
```

**Issues**:
- ❌ **CRITICAL**: Uses property name `"Monogram Initials"` (plural) instead of `"PERSONALISED INITIAL"` (singular)
- ✅ **Good**: Joins multiple engravings with comma separator
- ✅ **Good**: Defaults to "N/A" when no engravings
- ✅ **Good**: Trims and uppercases engravings

#### Location: Lines 3692-3705
**Purpose**: Hidden properties for individual vessel engravings

**Code**:
```javascript
// Add vessel engravings (hidden) - one per vessel
for (let i = 1; i <= multiplier; i++) {
  const vesselEngravingData = state.engraving?.vessels?.[i] || "";
  const vesselEngraving = this.getVesselEngravingText(vesselEngravingData);
  if (
    engravingEnabled &&
    vesselEngraving &&
    vesselEngraving.trim() !== ""
  ) {
    properties[`_Vessel ${i} Engraving`] = vesselEngraving
      .trim()
      .toUpperCase();
  }
}
```

**Issues**:
- ✅ **Good**: Uses hidden property naming convention with underscore prefix
- ✅ **Good**: Individual vessel engravings stored separately

#### Location: Lines 3792
**Purpose**: Sets "Monogram Initials" for add-on products

**Code**:
```javascript
properties: {
  // VISIBLE PROPERTIES (for checkout display)
  "Monogram Initials": "N/A",
  // ...
}
```

**Issues**:
- ❌ **CRITICAL**: Uses `"Monogram Initials"` instead of `"PERSONALISED INITIAL"`
- ✅ **Good**: Correctly sets to "N/A" for add-on products

---

### 6. **sections/main-cart-footer.liquid**

#### Location: Lines 308-350
**Purpose**: Cart patch script - ensures all items have PERSONALISED INITIAL property

**Code**:
```javascript
document.addEventListener("DOMContentLoaded", function () {
  if (window.sessionStorage.getItem('monogram-patch-complete')) return;

  fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      const needsFix = cart.items.some(item =>
        !item.properties || !item.properties["PERSONALISED INITIAL"]
      );

      if (!needsFix) return;

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

      return fetch('/cart/clear.js', { method: 'POST' })
        .then(() =>
          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: rebuiltItems })
          })
        )
        .then(() => {
          window.sessionStorage.setItem('monogram-patch-complete', 'true');
          window.location.reload();
        });
    });
});
```

**Issues**:
- ✅ **Good**: Uses correct property name `"PERSONALISED INITIAL"`
- ✅ **Good**: Only runs once per visit using sessionStorage
- ✅ **Good**: Defaults to "NONE" when property is missing
- ⚠️ **Issue**: Does not handle items with `"Monogram Initials"` property (different name)
- ⚠️ **Issue**: Clears entire cart and re-adds - could cause issues if user is mid-checkout

---

### 7. **snippets/checkout-products-wrap.liquid**

#### Location: Lines 70-89
**Purpose**: Displays monogram information in checkout view

**Code**:
```liquid
{% comment %} Find engraving text from properties {% endcomment %}
{% assign engraving_text = '' %}
{% for property in item.properties %}
  {% if property.first contains 'Engraving' %}
    {% assign engraving_text = property.last %}
    {% break %}
  {% endif %}
{% endfor %}

{% comment %} Show monogram information if present {% endcomment %}
{% if engraving_text != blank %}
  <div class="checkout-products-wrap__option-chip">
    Monogram Initials: {{ engraving_text }}
  </div>
{% else %}
  <div class="checkout-products-wrap__option-chip">
    Monogram Initials: N/A
  </div>
{% endif %}
```

**Issues**:
- ⚠️ **Issue**: Uses `contains 'Engraving'` which matches both "PERSONALISED INITIAL" and "Monogram Initials" (if they contain "Engraving")
- ⚠️ **Issue**: Could match unintended properties like "_Vessel 1 Engraving" (hidden property)
- ✅ **Good**: Shows "N/A" when no engraving found

---

### 8. **sections/main-cart-items.liquid**

#### Location: Lines 302-315
**Purpose**: Displays monogram initials in cart items

**Code**:
```liquid
{% comment %} Find engraving text from properties {% endcomment %}
{% assign engraving_text = '' %}
{% for property in item.properties %}
  {% if property.first contains 'Engraving' %}
    {% assign engraving_text = property.last %}
    {% break %}
  {% endif %}
{% endfor %}

<div class="product-option">
  <dt>Monogram Initials:</dt>
  <dd>{{ engraving_text | default: 'N/A' }}</dd>
</div>
```

**Issues**:
- ⚠️ **Issue**: Same as checkout-products-wrap.liquid - uses `contains 'Engraving'` which could match unintended properties

---

## Summary of Issues

### Critical Issues (Must Fix)

1. **Property Name Inconsistency**
   - Some code uses `"PERSONALISED INITIAL"` (singular)
   - Other code uses `"Monogram Initials"` (plural)
   - **Impact**: Cart patch script won't find items with "Monogram Initials", display logic may miss items
   - **Files Affected**: 
     - `snippets/pomc-system.liquid` (line 454)
     - `assets/mini-atc-modal.js` (lines 3666, 3668, 3792)
     - vs. most other files using `"PERSONALISED INITIAL"`

2. **Duplicate ID Attributes**
   - Multiple elements have both `id="monogram"` and `id="monogram-initials"`
   - **Impact**: Invalid HTML, can cause JavaScript selector issues
   - **Files Affected**:
     - `snippets/product-variant-picker.liquid` (line 129)
     - `assets/global.js` (line 989)

3. **Character Limit Inconsistencies**
   - `pdp-chuug-vessel.liquid`: `maxlength="1"` (single character)
   - `pomc-system.liquid`: `maxlength="3"` (three characters)
   - `product-variant-picker.liquid`: `maxlength="3"` but label says "Max 1 Characters"
   - `global.js`: `maxlength="3"` but label says "Max 1 Characters"
   - **Impact**: User confusion, potential data inconsistency

4. **Validation Rule Inconsistencies**
   - Some labels say "text and numbers only"
   - Other labels say "no numbers or symbols"
   - JavaScript validation enforces letters-only
   - **Impact**: Confusing user experience

### Medium Priority Issues

5. **Missing Property Name Handling in Cart Patch**
   - Cart patch script only checks for `"PERSONALISED INITIAL"` but not `"Monogram Initials"`
   - Items added via mini-atc-modal won't be patched

6. **Display Logic Could Match Wrong Properties**
   - Uses `contains 'Engraving'` which could match hidden properties like `"_Vessel 1 Engraving"`

7. **Inline Styles**
   - Several files use inline styles instead of CSS classes

### Low Priority Issues

8. **Missing Autocapitalize Attribute**
   - `pomc-system.liquid` input doesn't have `autocapitalize="characters"`

9. **No Validation Before Cart Add**
   - Some implementations don't validate character length before adding to cart

---

## Recommendations

### Immediate Actions Required

1. **Standardize Property Name**
   - Choose ONE property name: Either `"PERSONALISED INITIAL"` or `"Monogram Initials"`
   - Update all files to use the chosen name
   - **Recommendation**: Use `"PERSONALISED INITIAL"` as it's more widely used

2. **Fix Duplicate ID Attributes**
   - Remove `id="monogram"` from inputs, keep only `id="monogram-initials"`
   - Update any JavaScript that references `id="monogram"`

3. **Standardize Character Limits**
   - Decide: Single character or multiple characters?
   - Update all inputs and labels to match
   - **Recommendation**: Based on placeholder "ENTER Initial" (singular), use `maxlength="1"`

4. **Standardize Validation Rules**
   - Decide: Letters-only or letters+numbers?
   - Update all labels and validation to match
   - **Recommendation**: Letters-only (A-Z) based on JavaScript validation

### Medium Priority Improvements

5. **Update Cart Patch Script**
   - Check for both property names, or standardize first
   - Consider migrating old property name to new one

6. **Improve Display Logic**
   - Use exact property name matching instead of `contains 'Engraving'`
   - Check for both property names if needed during transition

7. **Move Inline Styles to CSS**
   - Create CSS classes for input styling
   - Remove inline `style` attributes

### Long-term Improvements

8. **Add Server-Side Validation**
   - Validate property values in Liquid before displaying
   - Ensure consistent formatting

9. **Create Shared Validation Function**
   - Centralize validation logic in a shared JavaScript file
   - Ensure all inputs use the same validation rules

10. **Add Unit Tests**
    - Test validation logic
    - Test cart add functionality
    - Test display logic

---

## Code Quality Metrics

- **Files Reviewed**: 8
- **Critical Issues**: 4
- **Medium Priority Issues**: 3
- **Low Priority Issues**: 3
- **Total Issues Found**: 10

---

## Conclusion

The Monogram Initials feature has several critical inconsistencies that need to be addressed immediately. The most critical issue is the use of two different property names, which can cause items to be missed during cart operations and display. Additionally, duplicate ID attributes and inconsistent character limits need to be fixed to ensure proper functionality.

**Priority**: High - These issues should be fixed before they cause customer-facing problems.

---

*Review completed on all code containing "Monogram Initials" or "PERSONALISED INITIAL"*

