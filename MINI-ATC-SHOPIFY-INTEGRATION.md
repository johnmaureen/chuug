# Mini ATC Modal - Shopify Integration

## Overview

The Mini ATC Modal now includes comprehensive Shopify add to cart API integration that collects all personalization data, vessel selections, and add-ons, then adds them to the Shopify cart with proper properties and attributes.

## Features Integrated

### 1. Vessel Products
- ✅ **Engraving Support**: Collects vessel engraving text (max 3 letters)
- ✅ **Multiple Vessels**: Supports 1x, 2x, or 3x vessel configurations from POMC system
- ✅ **Variant Selection**: Automatically selects correct variant based on engraving enabled/disabled
- ✅ **Product Properties**: Adds vessel-specific properties to cart items

### 2. Add-ons
- ✅ **Gift Box**: Premium gift box toggle integration
- ✅ **Mix & Match**: Variable quantity selection for different variants
- ✅ **Extra Cups**: Additional cup variants with quantity controls

### 3. Data Collection
- ✅ **Order Notes**: Automatic summary of personalization and add-ons
- ✅ **Order Attributes**: Detailed metadata for order processing
- ✅ **Properties**: Individual item properties for customization

## Implementation Details

### Button Behavior
When clicking the `mini-atc-modal__add-to-cart-btn`:

1. **Data Collection**: Gathers all modal state data
2. **Validation**: Ensures items exist before proceeding
3. **API Call**: Makes POST request to `/cart/add.js`
4. **UI Updates**: Shows loading state and updates cart
5. **Completion**: Closes modal and optionally redirects

### Data Structure

#### Vessel Products
```javascript
{
  id: variantId, // Engraving variant if enabled, regular variant if not
  quantity: 1,
  properties: {
    "Vessel 1 Engraving": "ABC", // If engraving enabled and provided
    "Vessel 1 Product": "product-handle",
    "Vessel 1 Wood Type": "DAWN"
  }
}
```

#### Add-on Products
```javascript
{
  id: variantId,
  quantity: selectedQuantity,
  properties: {
    "Add-on": "Premium Gift Box" // or "Mix & Match", "Extra Cups"
  }
}
```

#### Order Attributes
```javascript
{
  "Order Source": "Mini ATC Modal",
  "Engraving Enabled": "Yes",
  "Vessel Count": "2",
  "Vessel 1 Text": "ABC",
  "Vessel 2 Text": "XYZ"
}
```

## Integration Points

### POMC System Integration
The integration connects with the existing POMC (Product Options Management Component) system:

- `window.pomcSystem.getAllVesselSelections()` - Gets vessel product selections
- `window.pomcSystem.getMultiplier()` - Gets vessel count (1x, 2x, 3x)
- `window.pomcSystem.getSelectedProductAmountData()` - Gets pricing data

### Engraving Logic
- Checks `isEngravingEnabled()` to determine variant selection
- Uses engraving variant ID if engraving is enabled
- Falls back to regular variant ID if engraving is disabled
- Sanitizes engraving text to uppercase letters only (max 3)

### Error Handling
- Network errors are caught and displayed to user
- Shopify API errors are parsed and shown
- Loading states prevent multiple submissions
- Fallback error messages for unknown issues

## API Endpoints

### Add to Cart
**Endpoint**: `POST /cart/add.js`

**Request Body**:
```json
{
  "items": [
    {
      "id": "variant-id",
      "quantity": 1,
      "properties": {
        "Vessel 1 Engraving": "ABC"
      }
    }
  ],
  "note": "Personalized 2 vessel(s) with engraving | Add-ons: Premium Gift Box",
  "attributes": {
    "Order Source": "Mini ATC Modal",
    "Engraving Enabled": "Yes"
  }
}
```

## Configuration

### Gift Box Variant ID
Set the gift box variant ID in one of these ways:

1. **Modal Config** (recommended):
```javascript
{
  "giftBox": {
    "variantId": "12345678"
  }
}
```

2. **DOM Attribute**:
```html
<input data-gift-box-variant-id="12345678" />
```

### Event Listeners
The integration emits custom events:

- `cartUpdated` - When items are successfully added
- `cartError` - When add to cart fails
- `checkoutInitiated` - When proceeding to checkout

## Testing

### Test Scenarios
1. **Single Vessel + Engraving**: Select 1 vessel with engraving text
2. **Multiple Vessels**: Select 2x or 3x vessels with different engravings
3. **Add-ons Only**: Enable gift box without vessels
4. **Mixed Configuration**: Vessels + engraving + gift box + mix & match
5. **Error Cases**: Invalid variant IDs, network failures

### Debug Information
Enable console logging to see:
- Collected cart data before API call
- Shopify API responses
- Error messages and stack traces

## Browser Compatibility
- Modern browsers with ES6+ support
- Async/await support required
- Fetch API support required

## Dependencies
- POMC System (`window.pomcSystem`)
- Shopify Cart API (`/cart/add.js`)
- Existing modal state management
- Optional: Cart drawer for UI updates

## Future Enhancements
- Toast notifications for better UX
- Retry logic for failed requests
- Batch add to cart for better performance
- Analytics tracking integration
- A/B testing support for different flows
