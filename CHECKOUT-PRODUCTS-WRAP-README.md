# Checkout Products Wrap Component

A pixel-perfect implementation of the checkout product toggle component based on the Figma design specifications.

## Features

- **Pixel-perfect design**: Matches the Figma design exactly with proper dimensions, spacing, and typography
- **Responsive**: Adapts to different screen sizes while maintaining design integrity
- **Interactive**: Includes delete functionality with smooth animations
- **Accessible**: Proper ARIA labels and semantic HTML structure
- **Customizable**: Easy to modify for different product types and options

## Design Specifications

Based on Figma design (node-id: 1909-13145):

- **Container**: 550px width, white background with shadow
- **Layout**: Row layout with 24px gap between image and content
- **Product Image**: 128x128px with 5px border radius
- **Product Title**: Merriweather Bold 18px, color #0D2026
- **Delete Button**: 25x25px trash icon, color #969393
- **Product Options**: Yellow chips (#DBE188) with black text, 12px Gabarito font
- **Pricing**: Current price (20px, #1B333B) and original price (16px, #969393, strikethrough)

## Files

- `snippets/checkout-products-wrap.liquid` - Main component template
- `assets/checkout-products-wrap.css` - Component styles
- `snippets/checkout-products-wrap-example.liquid` - Usage example

## Usage

### Basic Usage

```liquid
{% render 'checkout-products-wrap', item: cart_item %}
```

### In a Cart Template

```liquid
{{ 'checkout-products-wrap.css' | asset_url | stylesheet_tag }}

<div class="checkout-products-container">
  {% for item in cart.items %}
    {% render 'checkout-products-wrap', item: item %}
  {% endfor %}
</div>
```

### In a Checkout Template

```liquid
{{ 'checkout-products-wrap.css' | asset_url | stylesheet_tag }}

<div class="checkout-summary">
  {% for item in cart.items %}
    {% render 'checkout-products-wrap', item: item %}
  {% endfor %}
</div>
```

## Component Structure

```
checkout-products-wrap
├── checkout-products-wrap__container
│   ├── checkout-products-wrap__image
│   │   └── checkout-products-wrap__image-container
│   └── checkout-products-wrap__details
│       ├── checkout-products-wrap__header
│       │   ├── checkout-products-wrap__title
│       │   └── checkout-products-wrap__delete
│       ├── checkout-products-wrap__options
│       │   └── checkout-products-wrap__option-chip (multiple)
│       └── checkout-products-wrap__pricing
│           ├── checkout-products-wrap__current-price
│           └── checkout-products-wrap__original-price
```

## Customization

### Product Options

The component automatically displays product options from cart item properties. For CHUUG products, it shows default options:

- 🔨 Engraved Initials, [TXT]
- 🍺 Silver Insulated Cup

### Styling

All styles are contained in `checkout-products-wrap.css` and use CSS custom properties for easy theming:

```css
.checkout-products-wrap {
  --primary-color: #0D2026;
  --secondary-color: #1B333B;
  --accent-color: #DBE188;
  --text-muted: #969393;
}
```

### Responsive Breakpoints

- **Desktop**: 550px width (default)
- **Tablet**: 100% width with reduced padding
- **Mobile**: Stacked layout with centered elements

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies

- Shopify Liquid templating
- Modern CSS (Flexbox, CSS Grid)
- No JavaScript frameworks required

## Performance

- Optimized images with lazy loading
- Minimal CSS footprint
- Efficient DOM structure
- Smooth animations with CSS transitions
