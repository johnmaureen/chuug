# Vessel Selection Display Integration

## Overview

This document describes the implementation of image display functionality for the `.your-selection .selection-result-wrap` area, based on the image display system from `pomc-system.js`.

## Files Added/Modified

### New Files
- `assets/vessel-selection-display.js` - Main display system implementation
- `VESSEL-SELECTION-DISPLAY-INTEGRATION.md` - This documentation

### Modified Files
- `sections/pdp-chuug-vessel.liquid` - Added script inclusion

## Functionality

### Core Features

1. **Dynamic Image Display**: Shows vessel combinations based on wood finish and rope type selections
2. **Real-time Updates**: Automatically updates when users make selections
3. **Vessel Count Management**: Adapts display based on number of vessels selected (1X, 2X, 3X)
4. **Image Caching**: Optimized image loading with caching system
5. **Loading States**: Visual feedback during image loading

### Integration Points

The system integrates with the existing vessel selection system by:

1. **Listening to Selection Events**: Monitors wood type and rope type selections
2. **Syncing with POMC System**: Attempts to sync with existing `pomcSystem` if available
3. **Product Amount Changes**: Responds to vessel count changes
4. **Engraving Toggle**: Updates display when engraving preference changes

## API Reference

### Public Methods

```javascript
// Track a vessel selection
window.vesselSelectionDisplay.trackVesselSelection(vesselNumber, woodType, ropeType);

// Update vessel count
window.vesselSelectionDisplay.updateVesselCount(count);

// Update display
window.vesselSelectionDisplay.updateSelectionDisplay();

// Get current selections
const selections = window.vesselSelectionDisplay.getVesselSelections();

// Clear all selections
window.vesselSelectionDisplay.clearSelections();

// Sync with existing system
window.vesselSelectionDisplay.syncWithExistingSelections();

// Debug functions
window.vesselSelectionDisplay.debug();
const state = window.vesselSelectionDisplay.getDisplayState();
```

### Event Integration

The system automatically listens for:

- `change` events on wood/rope material inputs
- `click` events on dropdown selections
- `click` events on product amount buttons
- `click` events on engraving toggle buttons

## Image Display Logic

### Image Sources

1. **Complete Selection**: `${woodType}_${ropeType}.png` (e.g., `dusk_charcoal.png`)
2. **Partial Selection**: Placeholder SVG
3. **No Selection**: Placeholder SVG

### Caching System

- Images are cached in `displayState.imageCache`
- Prevents redundant loading of the same images
- Optimized loading with preload technique

### Loading States

- Shows loading spinner during image load
- Graceful fallback to placeholder on error
- Smooth transitions between states

## CSS Classes

The system uses existing CSS classes from `vessel-tabs.css`:

- `.selection-result-wrap` - Main container
- `.result-item` - Individual vessel display
- `.img-wrap` - Image container
- `.loading` - Loading state
- `.active-vessel` - Active vessel indicator

## Debugging & Logging

The system includes comprehensive logging functionality to track all vessel selections and system events.

### Logging Features

#### Automatic Logging
The system automatically logs:
- 🎯 **Vessel Selection Updates**: When wood/rope types are selected
- 🔢 **Vessel Count Changes**: When switching between 1X, 2X, 3X
- 🖼️ **Image Loading**: Success/failure of image loads
- 🔄 **Display Updates**: When the selection display is refreshed
- 🌳 **Wood Selection Events**: When wood finish is selected
- 🪢 **Rope Selection Events**: When rope type is selected
- 🔄 **System Sync**: When syncing with POMC system

#### Manual Logging Functions

```javascript
// Log current selections
window.vesselSelectionDisplay.logSelections();

// Show comprehensive debug info
window.vesselSelectionDisplay.debug();

// Get detailed state
const state = window.vesselSelectionDisplay.getDisplayState();
console.log(state);

// Enable/disable verbose logging
window.vesselSelectionDisplay.enableVerboseLogging();
window.vesselSelectionDisplay.disableVerboseLogging();
```

### Console Output Examples

```javascript
// Selection update log
🎯 Vessel Selection Update: {
  vesselNumber: 1,
  woodType: "DUSK",
  ropeType: "CHARCOAL",
  timestamp: "2024-01-15T10:30:00.000Z",
  previousSelection: { woodType: null, ropeType: null }
}

// Image loading log
🖼️ Loading Image: {
  imageName: "dusk_charcoal.png",
  src: "/assets/dusk_charcoal.png",
  woodType: "DUSK",
  ropeType: "CHARCOAL",
  shouldShowLoading: true,
  timestamp: "2024-01-15T10:30:00.000Z"
}

// System initialization log
🚀 Initializing Vessel Selection Display System: {
  timestamp: "2024-01-15T10:30:00.000Z",
  userAgent: "Mozilla/5.0...",
  url: "https://example.com/vessel-page"
}
```

### Testing

Use the provided test file `vessel-selection-logging-test.html` to:
- Test all logging functions
- Simulate selection events
- Monitor console output
- Debug system integration

## Browser Compatibility

- Modern browsers with ES6+ support
- Uses `Map` for caching
- Event delegation for performance
- Debounced updates to prevent excessive re-renders

## Performance Considerations

1. **Debounced Updates**: 100ms delay to prevent excessive updates
2. **DOM Caching**: Cached DOM queries for better performance
3. **Image Preloading**: Optimized image loading with preload technique
4. **Event Delegation**: Efficient event handling

## Future Enhancements

1. **Animation Support**: Smooth transitions between vessel displays
2. **Custom Image Sources**: Support for different image sources
3. **Advanced Caching**: More sophisticated caching strategies
4. **Accessibility**: Enhanced screen reader support
5. **Mobile Optimization**: Touch-friendly interactions

## Troubleshooting

### Common Issues

1. **Images Not Loading**: Check image paths and Shopify asset URLs
2. **Selections Not Updating**: Verify event listeners are properly attached
3. **Display Not Showing**: Check if `.selection-result-wrap` element exists

### Debug Steps

1. Open browser console
2. Run `window.vesselSelectionDisplay.debug()`
3. Check for JavaScript errors
4. Verify DOM elements exist
5. Test manual API calls

## Integration with Existing Systems

The system is designed to work alongside:

- `pomc-system.js` - Main vessel selection system
- `mini-atc-modal.js` - Mini cart functionality
- Existing dropdown systems
- Product amount selection
- Engraving toggle system

## Maintenance

- Monitor console for errors
- Update image paths if asset structure changes
- Test with different vessel combinations
- Verify mobile responsiveness
- Check performance with multiple vessels
