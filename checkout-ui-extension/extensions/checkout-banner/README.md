# Checkout Banner UI Extension

This Shopify Checkout UI Extension demonstrates how to implement the Banner component with different status types and configurations.

## Features

- **Multiple Banner Types**: Support for `info`, `success`, `warning`, and `critical` status banners
- **Configurable Settings**: Customize banner content through extension settings
- **Dismissible Banners**: Allow customers to dismiss non-critical banners
- **Collapsible Content**: Support for expandable/collapsible banner content
- **Action Buttons**: Include call-to-action buttons within banners

## Banner Status Types

### Info Banner (`info`)
- Convey general information or actions that aren't critical
- Use for shipping information, general updates, or helpful tips

### Success Banner (`success`)
- Use sparingly for additional visual confirmation of completed actions
- Example: Free shipping applied, item added to order

### Warning Banner (`warning`)
- Display information that needs attention
- Should not block progress to next step
- Example: Limited stock, shipping delays

### Critical Banner (`critical`)
- Communicate problems that must be resolved immediately
- Example: Payment verification failed, required information missing

## Configuration

The extension can be configured through the `shopify.extension.toml` file with the following settings:

- `banner_type`: Type of banner (info, success, warning, critical)
- `banner_title`: Title text for the banner
- `banner_message`: Main message content
- `is_dismissible`: Allow customers to dismiss the banner
- `is_collapsible`: Allow customers to collapse/expand the banner

## Usage Examples

### Basic Banner
```jsx
<Banner
  status="info"
  title="Important Information"
  onDismiss={() => console.log('Banner dismissed')}
>
  <Text>This is an important message for your customers.</Text>
</Banner>
```

### Critical Banner with Action
```jsx
<Banner
  status="critical"
  title="Payment verification failed"
  onDismiss={() => console.log('Banner dismissed')}
>
  <Text>Your payment details couldn't be verified.</Text>
  <Button kind="secondary" onPress={handleRetry}>
    Try Again
  </Button>
</Banner>
```

### Collapsible Banner
```jsx
<Banner
  status="info"
  title="Shipping Information"
  collapsible={true}
>
  <Text>Your order will be processed within 1-2 business days.</Text>
  <Text size="small">Additional shipping details...</Text>
</Banner>
```

## Best Practices

1. **Use banners thoughtfully**: Only for the most important information
2. **Place strategically**: Typically at the top of pages or sections
3. **Include actions**: Add buttons for next steps when possible
4. **Make dismissible**: Unless critical information that must be seen
5. **Choose status carefully**: 
   - `info` for general information
   - `warning` for attention needed (use sparingly)
   - `critical` for immediate action required (use sparingly)
   - `success` for confirmation of completed actions

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Deploy to Shopify:
   ```bash
   npm run deploy
   ```

## Files Structure

```
extensions/checkout-banner/
├── shopify.extension.toml    # Extension configuration
├── package.json              # Dependencies and scripts
├── src/
│   ├── CheckoutBanner.jsx    # Main banner component
│   └── examples/             # Example implementations
│       ├── PaymentErrorBanner.jsx
│       ├── SuccessBanner.jsx
│       ├── WarningBanner.jsx
│       └── InfoBanner.jsx
└── README.md                 # This file
```

## References

- [Shopify Checkout UI Extensions Documentation](https://shopify.dev/docs/api/checkout-ui-extensions)
- [Banner Component API](https://shopify.dev/docs/api/checkout-ui-extensions/latest/components/feedback/banner)
