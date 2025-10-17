# CHUUG Vessel Gallery Configuration Schema

## Overview
Created configurable image settings for the global CHUUG vessel carousels, allowing easy management through Shopify theme settings.

## What Was Implemented

### 1. Settings Schema (`config/settings_schema.json`)
Added new "CHUUG Vessel Gallery" section with:

#### Design Preview Carousel Images (Max 3)
- `design_preview_image_1` - First image for design preview modal
- `design_preview_image_2` - Second image for design preview modal
- `design_preview_image_3` - Third image for design preview modal

**Used in:** `design-preview-swiper-{{ section_id }}` carousel

#### Mini ATC Product Gallery Images (Max 3)
- `mini_atc_gallery_image_1` - First image for mini ATC gallery
- `mini_atc_gallery_image_2` - Second image for mini ATC gallery
- `mini_atc_gallery_image_3` - Third image for mini ATC gallery

**Used in:** `mini-atc-product-swiper-{{ section_id }}` carousel

### 2. Settings Data (`config/settings_data.json`)
Default values set to use existing `PHOTO_ASSET_*.png` images:
```json
"design_preview_image_1": "shopify://shop_images/PHOTO_ASSET_1.png",
"design_preview_image_2": "shopify://shop_images/PHOTO_ASSET_2.png",
"design_preview_image_3": "shopify://shop_images/PHOTO_ASSET_3.png",
"mini_atc_gallery_image_1": "shopify://shop_images/PHOTO_ASSET_1.png",
"mini_atc_gallery_image_2": "shopify://shop_images/PHOTO_ASSET_2.png",
"mini_atc_gallery_image_3": "shopify://shop_images/PHOTO_ASSET_3.png"
```

### 3. Template Updates

#### Files Modified:
- `snippets/mini-atc-modal-complete.liquid`
- `snippets/mini-atc-modal-complete.optimized.liquid`

#### Changes Made:

**Mini ATC Product Gallery (Lines ~117-166)**
- Replaced hardcoded `PHOTO_ASSET_*.png` references
- Now uses `settings.mini_atc_gallery_image_1/2/3`
- Images only render if settings are configured (conditional logic)
- Proper Shopify image optimization with `image_url: width: 800`

**Design Preview Modal Gallery (Lines ~520-562)**
- Replaced dynamic JavaScript loading with static settings-based images
- Now uses `settings.design_preview_image_1/2/3`
- Images only render if settings are configured
- Fallback message if no images configured
- Proper Shopify image optimization with `image_url: width: 934`

## How to Use

### In Shopify Admin:
1. Go to **Online Store** → **Themes** → **Customize**
2. Navigate to **Theme settings**
3. Find **"CHUUG Vessel Gallery"** section
4. Upload/select images for:
   - **Design Preview Carousel Images** (max 3)
   - **Mini ATC Product Gallery Images** (max 3)
5. Save changes

### Benefits:
✅ No more hardcoded asset references  
✅ Easy to change images through Shopify admin  
✅ Supports 0-3 images per carousel (flexible)  
✅ Proper Shopify CDN optimization  
✅ Clean fallback handling  
✅ Global configuration (since cart is global)

## Technical Details

### Image Specifications:
- **Mini ATC Gallery**: Optimized at 800px width
- **Design Preview**: Optimized at 934px width (2x for 467px display)
- **Format**: Supports all Shopify image formats (PNG, JPG, WebP, etc.)

### Carousel IDs:
- **Mini ATC**: `mini-atc-product-swiper-{{ section_id }}`
- **Design Preview**: `design-preview-swiper-{{ section_id }}`

### Conditional Rendering:
Both carousels check if images exist before rendering:
```liquid
{%- if settings.mini_atc_gallery_image_1 != blank -%}
  <!-- Image markup -->
{%- endif -%}
```

## Migration Notes

### Before:
- Images were hardcoded: `{{ 'PHOTO_ASSET_1.png' | asset_url }}`
- Design preview loaded dynamically via JavaScript from product data

### After:
- Images configured through Shopify theme settings
- Design preview uses static images from settings
- JavaScript dynamic loading removed in favor of settings-based approach

## Files Changed
1. ✅ `config/settings_schema.json` - Added schema
2. ✅ `config/settings_data.json` - Added default values
3. ✅ `snippets/mini-atc-modal-complete.liquid` - Updated to use settings
4. ✅ `snippets/mini-atc-modal-complete.optimized.liquid` - Updated to use settings

---

**Date Implemented:** October 17, 2025  
**Branch:** feat/optimisation

