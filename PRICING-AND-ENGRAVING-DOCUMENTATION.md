# Pricing and Coin Engraving Personalization Documentation

## Overview

This document provides a comprehensive review of the pricing functionality and Coin Engraving Personalization features in the CHUUG e-commerce platform. The system integrates multiple components to provide dynamic pricing, personalization options, and seamless cart management.

## Table of Contents

1. [Pricing System Architecture](#pricing-system-architecture)
2. [Coin Engraving Personalization](#coin-engraving-personalization)
3. [Component Integration](#component-integration)
4. [Key Features](#key-features)
5. [Technical Implementation](#technical-implementation)
6. [Configuration and Settings](#configuration-and-settings)
7. [Troubleshooting](#troubleshooting)

## Pricing System Architecture

### Core Components

#### 1. POMC System (`assets/pomc-system.js`)
- **Purpose**: Central vessel selection and pricing management system
- **Key Features**:
  - Vessel selection tracking (wood type, rope type, product combinations)
  - Multiplier-based pricing (1-3 vessels)
  - Currency-aware pricing with fallbacks
  - Charcoal upgrade pricing management

#### 2. Pricing Calculator (`assets/mini-atc-modal.js`)
- **Purpose**: Dynamic price calculation based on current state
- **Key Methods**:
  - `calculateTotal(state)`: Main pricing calculation
  - `getVesselPricingForMultiplier()`: Gets pricing from POMC system
  - `updateCartItemCompareAtPrices()`: Updates cart pricing

#### 3. Mini ATC Modal (`snippets/mini-atc-modal-complete.liquid`)
- **Purpose**: User interface for personalization and pricing display
- **Features**:
  - Interactive pricing display
  - Real-time price updates
  - Gift box and add-on pricing

### Pricing Structure

#### Base Vessel Pricing
```javascript
// Pricing is determined by:
1. Vessel count (multiplier: 1-3)
2. Wood type (Dusk, Dawn, Midnight)
3. Rope type (Natural, Charcoal)
4. Engraving option (enabled/disabled)
```

#### Add-on Pricing
- **Gift Box**: £2.00 per vessel (configurable)
- **Charcoal Upgrade**: Currency-specific pricing
  - USD: $4.00
  - AUD: $6.00
  - Default: $2.99
- **Mix & Match Variants**: £12.99 per item (fallback)

## Coin Engraving Personalization

### User Interface

#### Toggle Control
```html
<input
  type="checkbox"
  id="{{ modal_id }}-engraving-toggle"
  data-personalization-toggle="engraving"
  checked
>
```

#### Vessel Input Fields
- **Limit**: 3 characters per vessel
- **Pattern**: Letters only (`[A-Za-z]{0,3}`)
- **Validation**: Real-time input validation
- **Storage**: Persistent across sessions

### Functionality

#### 1. Engraving State Management
```javascript
// State structure
engraving: {
  enabled: true,
  vessels: {
    1: "ABC", // Vessel 1 engraving
    2: "XYZ"  // Vessel 2 engraving
  }
}
```

#### 2. Pricing Impact
- Engraving affects variant selection in POMC system
- Different pricing tiers based on engraving status
- Cart updates reflect engraving changes

#### 3. Cart Integration
- Engraving text stored as line item properties
- Format: `properties[Vessel {i} Engraving]`
- Order notes include personalization summary

## Component Integration

### 1. POMC System Integration

#### Vessel Selection Flow
```javascript
// 1. User selects vessel configuration
window.pomcSystem.setVesselSelection(vesselNum, {
  woodType: 'midnight',
  ropeType: 'charcoal',
  productId: '123456789',
  productHandle: 'midnight-charcoal'
});

// 2. System calculates pricing
const pricing = window.pomcSystem.getSelectedProductAmountData();

// 3. Mini ATC modal updates pricing display
modalInstance.calculatePricing();
```

#### Multiplier System
- **Purpose**: Determines vessel count for pricing
- **Range**: 1-3 vessels
- **Impact**: Affects base pricing and add-on calculations

### 2. Mini ATC Modal Integration

#### Pricing Updates
```javascript
// Real-time pricing updates
pricingCalculator.on('priceCalculated', (pricingData) => {
  updatePricingDisplay(pricingData);
  updateCartTotals(pricingData);
});
```

#### State Synchronization
- Engraving state synced between modal and POMC system
- Cart updates reflect current personalization state
- Persistent storage across page loads

## Key Features

### 1. Dynamic Pricing
- **Real-time Updates**: Prices update as user changes selections
- **Currency Support**: Multi-currency pricing with fallbacks
- **Volume Discounts**: Pricing tiers based on vessel count

### 2. Personalization Options
- **Coin Engraving**: Up to 3 characters per vessel
- **Vessel Selection**: Individual vessel personalization
- **Design Preview**: Modal showing engraving examples

### 3. Cart Management
- **Line Item Properties**: Engraving text stored as properties
- **Variant Selection**: Automatic variant selection based on configuration
- **Price Updates**: Real-time cart price updates

### 4. User Experience
- **Accessibility**: ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-optimized interface
- **Error Handling**: Graceful fallbacks for missing data

## Technical Implementation

### 1. State Management

#### Personalization State
```javascript
class PersonalizationState extends EventEmitter {
  constructor() {
    this.state = {
      engraving: { enabled: true, vessels: {} },
      mixMatch: { enabled: true, variants: {} },
      extraCups: { enabled: false, variants: {} },
      giftBox: { enabled: false }
    };
  }
}
```

#### Storage Management
- **Local Storage**: Persistent user preferences
- **Session Storage**: Temporary state during checkout
- **State Restoration**: Loads saved state on page load

### 2. Event System

#### Custom Events
```javascript
// POMC system events
document.dispatchEvent(new CustomEvent('pomcProductAmountChanged', {
  detail: { amount, data }
}));

// Pricing events
pricingCalculator.emit('priceCalculated', pricingData);
```

#### Event Listeners
- **Engraving Toggle**: Updates pricing and cart
- **Vessel Input**: Real-time validation and updates
- **POMC Changes**: Synchronizes with pricing system

### 3. API Integration

#### GraphQL Integration (Disabled)
```javascript
// GraphQL pricing (currently disabled to prevent 403 errors)
async getVesselPricingViaGraphQL() {
  // Fallback to static pricing
  return this.getVesselPricingForMultiplier();
}
```

#### Cart API
- **Add to Cart**: Handles personalization properties
- **Update Cart**: Modifies existing items
- **Price Updates**: Real-time cart total updates

## Configuration and Settings

### 1. Theme Settings

#### Mini ATC Gallery Images
```liquid
{%- if settings.mini_atc_gallery_image_1 != blank -%}
  <img src="{{ settings.mini_atc_gallery_image_1 | image_url: width: 800 }}" />
{%- endif -%}
```

#### Design Preview Images
```liquid
{%- if settings.design_preview_image_1 != blank -%}
  <img src="{{ settings.design_preview_image_1 | image_url: width: 934 }}" />
{%- endif -%}
```

### 2. Product Configuration

#### Charcoal Upgrade Product
```liquid
{%- assign charcoal_upgrade_product = all_products['charcoal-rope-upgrade'] -%}
{%- if charcoal_upgrade_product and charcoal_upgrade_product.variants.size > 0 -%}
  <script>
    window.CHARCOAL_UPGRADE_VARIANT_ID = '{{ charcoal_upgrade_product.variants.first.id }}';
  </script>
{%- endif -%}
```

### 3. Currency Configuration

#### Currency-Specific Pricing
```javascript
const CHARCOAL_UPGRADE_PRICES = {
  USD: 400,  // $4.00
  AUD: 600,  // $6.00
  DEFAULT: 299  // $2.99
};
```

## Troubleshooting

### Common Issues

#### 1. Pricing Not Updating
- **Cause**: POMC system not initialized
- **Solution**: Check `window.pomcSystem` availability
- **Debug**: Console logs show pricing calculation steps

#### 2. Engraving Not Persisting
- **Cause**: Local storage issues
- **Solution**: Check `StorageManager.load()` and `StorageManager.save()`
- **Debug**: Verify state persistence in browser dev tools

#### 3. Cart Updates Failing
- **Cause**: API rate limiting or network issues
- **Solution**: Implement retry logic and fallbacks
- **Debug**: Check network tab for failed requests

### Debug Information

#### Console Logging
```javascript
// Pricing debug
console.log("🎁 Gift box pricing added:", {
  pricePerBox: giftBoxPrice,
  multiplier: multiplier,
  total: giftBoxTotal
});

// Engraving debug
console.log("🔄 Engraving state reset - verification:", {
  engravingVessels: verification?.engraving?.vessels,
  shouldBeEmpty: Object.keys(verification?.engraving?.vessels || {}).length === 0
});
```

#### State Verification
```javascript
// Check POMC system state
console.log("POMC System State:", {
  multiplier: window.pomcSystem?.getMultiplier(),
  selectedProductAmount: window.pomcSystem?.getSelectedProductAmount(),
  vesselSelections: window.pomcSystem?.getAllVesselSelections()
});
```

## File Structure

### Key Files
- `assets/mini-atc-modal.js` - Main modal functionality
- `assets/pomc-system.js` - Vessel selection system
- `snippets/mini-atc-modal-complete.liquid` - Modal template
- `assets/mini-atc-modal.css` - Modal styling
- `snippets/personalization-icon.liquid` - Icon components

### Dependencies
- Swiper.js for image galleries
- Shopify Liquid for templating
- Local Storage API for state persistence
- Custom event system for component communication

## Future Enhancements

### Planned Features
1. **GraphQL Integration**: Re-enable dynamic pricing via GraphQL
2. **Advanced Personalization**: Additional engraving options
3. **Bulk Pricing**: Volume discounts for larger orders
4. **Analytics Integration**: Track personalization preferences

### Performance Optimizations
1. **Lazy Loading**: Defer non-critical components
2. **Caching**: Implement pricing cache
3. **Bundle Optimization**: Reduce JavaScript bundle size
4. **Image Optimization**: Compress and optimize gallery images

---

*This documentation is current as of the latest codebase review. For updates or questions, refer to the development team.*
