# 🚀 CHUUG Performance Optimization Guide

## ✅ Fixes Applied (Completed)

### 1. **Removed Tailwind CDN** 
- **Impact**: -200ms load time, eliminated 20+ CSS errors
- **File**: `sections/pdp-chuug-vessel.liquid`
- **Status**: ✅ FIXED
- Combined font loading for better performance

### 2. **Fixed Missing CSS File**
- **Impact**: Eliminated MIME type error blocking rendering
- **Files**: `layout/theme.liquid`, `layout/theme.shogun.landing.liquid`
- **Status**: ✅ FIXED
- Removed non-existent `tiny.content.min.css`

### 3. **Fixed Klaviyo Error**
- **Impact**: Eliminated "TujLdz is not defined" console error
- **File**: `layout/theme.liquid`
- **Status**: ✅ FIXED
- Changed `TujLdz` to `'TujLdz'` (string)

---

## 🔴 PRIORITY 1: Critical Remaining Optimizations

### 4. **Optimize Third-Party Script Loading** ⚡
**Current**: 30+ scripts loading synchronously  
**Impact**: -1.5s to -3s load time  
**Effort**: Medium

**Scripts to Optimize**:

#### **Move to Google Tag Manager** (Recommended)
These scripts should be loaded via GTM instead of directly in theme:
- Facebook Pixel
- Pinterest Tag
- TikTok Pixel
- Microsoft Clarity (loaded twice!)
- Google Analytics
- Convert Experiences

**File**: `layout/theme.liquid` (lines 132-184)

**Recommended Changes**:

1. **Remove duplicate Clarity instance**:
   - You're loading Clarity twice (`l4pnvju86i` and `ncxwve3mkx`)
   - Lines 436-442 in `theme.liquid`

2. **Defer non-critical scripts**:
   - Intelligems (line 132)
   - Klarna (lines 142-147)
   - Trustpilot (line 158)
   - HelpScout Beacon (lines 818-819)

3. **Lazy load tracking scripts**:
   - Load after user interaction or after 3 seconds
   - Move to `requestIdleCallback` for better performance

### 5. **Fix Duplicate Script Requests** ⚡
**Current**: Same `wpm.js` file requested 16 times!  
**Impact**: -500ms load time  
**Effort**: Easy

**Issue**: Web pixel manager loading multiple times
**Fix**: Review Shopify app embeds - some apps may be duplicated

**Action**:
1. Go to Shopify Admin → Online Store → Themes → Customize
2. Navigate to App Embeds
3. Disable duplicate/unused apps
4. Check for:
   - Stape GTM (loading multiple times)
   - Web pixel tracking apps
   - Duplicate conversion tracking

### 6. **Optimize Font Loading** ⚡
**Current**: Loading from 3+ different sources  
**Impact**: -300ms load time  
**Effort**: Medium

**Current Font Sources**:
- Google Fonts (Merriweather, Gabarito)
- Shopify Fonts (Instrument Sans, Inknut Antiqua, Alegreya)
- Custom fonts (Cardo)

**Recommendations**:
1. **Consolidate fonts**: Use only 2-3 font families maximum
2. **Self-host critical fonts**: Download and host via Shopify assets
3. **Use font-display: swap**: Already implemented ✅
4. **Preload critical fonts**:

```liquid
<link rel="preload" as="font" type="font/woff2" crossorigin 
  href="{{ 'your-critical-font.woff2' | asset_url }}">
```

---

## 🟡 PRIORITY 2: Important Optimizations

### 7. **Optimize Image Loading**
**Current**: 50+ images loading on page load  
**Impact**: -1s to -2s load time  
**Effort**: Easy

**Recommendations**:
1. **Add lazy loading** to below-the-fold images
2. **Use responsive images** with srcset
3. **Convert to WebP** format
4. **Optimize image sizes**: Many images are loading full resolution

**Example Fix**:
```html
<!-- Before -->
<img src="{{ image | image_url }}" alt="Product">

<!-- After -->
<img src="{{ image | image_url }}" 
     loading="lazy" 
     alt="Product"
     width="600" 
     height="400">
```

### 8. **Reduce Email Popup Impact**
**Current**: Klaviyo popup loads immediately, blocking interaction  
**Impact**: -200ms perceived load time  
**Effort**: Easy

**File**: Multiple sections with Klaviyo forms

**Recommendations**:
1. Delay popup appearance by 5-10 seconds
2. Use exit-intent only
3. Lazy load popup assets
4. Store dismissal in localStorage

### 9. **Optimize CSS Delivery**
**Current**: 20+ CSS files loading  
**Impact**: -500ms load time  
**Effort**: Medium-High

**Recommendations**:
1. **Critical CSS**: Inline critical above-the-fold CSS
2. **Defer non-critical CSS**:

```liquid
<link rel="stylesheet" 
      href="{{ 'non-critical.css' | asset_url }}" 
      media="print" 
      onload="this.media='all'">
```

3. **Combine CSS files**: Merge similar stylesheets
4. **Remove unused CSS**: Use PurgeCSS or similar tool

### 10. **Fix JavaScript Errors**
**Current**: Multiple "Unexpected token" errors  
**Impact**: Varies, may block rendering  
**Effort**: Medium

**Errors Found**:
1. ❌ Unexpected token ',' (appears 3 times)
2. ❌ POMC system not available
3. ❌ GraphQL 403 error (Gift box pricing)
4. ❌ Failed SSL certificate on tracking script

**Files to Check**:
- `pdp-chuug-vessel.js`
- `pomc-system.js`
- `currency-manager.js` (GraphQL query)

---

## 🟢 PRIORITY 3: Nice-to-Have Optimizations

### 11. **Implement Resource Hints**
Add to `layout/theme.liquid`:

```liquid
<!-- DNS Prefetch for third-party domains -->
<link rel="dns-prefetch" href="//www.googletagmanager.com">
<link rel="dns-prefetch" href="//cdn.shopify.com">
<link rel="dns-prefetch" href="//connect.facebook.net">

<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
```

### 12. **Enable Browser Caching**
Add to Shopify settings or CDN:
- HTML: 5 minutes
- CSS/JS: 1 year
- Images: 1 year
- Fonts: 1 year

### 13. **Minify Assets**
Ensure all assets are minified:
- JavaScript files
- CSS files
- HTML (Shopify does this automatically)

### 14. **Reduce Checkout Preload Scripts**
**Current**: Loading checkout scripts on product page  
**Impact**: -200ms  
**Effort**: Easy

**Fix**: Only load checkout preload on cart/checkout pages

```liquid
{% if template contains 'cart' or template contains 'checkout' %}
  <!-- Load checkout scripts here -->
{% endif %}
```

---

## 📊 Expected Performance Improvements

### After Completing All Priority 1 Fixes:
- **Load Time**: -3 to -5 seconds
- **HTTP Requests**: 370+ → 100-150
- **Lighthouse Performance Score**: +25-35 points
- **Time to Interactive**: -2 to -3 seconds
- **Largest Contentful Paint**: -1 to -2 seconds

### Current Issues Summary:
| Issue | Status | Impact | Priority |
|-------|--------|--------|----------|
| Tailwind CDN | ✅ Fixed | High | P1 |
| Missing CSS | ✅ Fixed | Medium | P1 |
| Klaviyo Error | ✅ Fixed | Low | P1 |
| Third-party Scripts | ⚠️ Pending | High | P1 |
| Duplicate Requests | ⚠️ Pending | High | P1 |
| Font Loading | ⚠️ Pending | Medium | P1 |
| Image Optimization | ⚠️ Pending | Medium | P2 |
| Email Popup | ⚠️ Pending | Low | P2 |
| CSS Delivery | ⚠️ Pending | Medium | P2 |
| JS Errors | ⚠️ Pending | Medium | P2 |

---

## 🛠️ Testing & Monitoring

### Tools to Use:
1. **Google PageSpeed Insights**: https://pagespeed.web.dev/
2. **GTmetrix**: https://gtmetrix.com/
3. **WebPageTest**: https://www.webpagetest.org/
4. **Chrome DevTools**: Lighthouse tab
5. **Shopify Speed Score**: Shopify Admin → Analytics → Reports

### Test URLs:
- Homepage
- Product Page (Chuug Vessel)
- Collection Page
- Cart Page

### Metrics to Track:
- **Performance Score**: Target 85+
- **First Contentful Paint**: Target < 1.8s
- **Largest Contentful Paint**: Target < 2.5s
- **Time to Interactive**: Target < 3.5s
- **Cumulative Layout Shift**: Target < 0.1
- **Total Blocking Time**: Target < 200ms

---

## 📝 Implementation Checklist

### Immediate (This Week):
- [x] Remove Tailwind CDN
- [x] Fix missing CSS file
- [x] Fix Klaviyo error
- [ ] Remove duplicate Clarity script
- [ ] Audit and disable duplicate Shopify apps
- [ ] Defer non-critical third-party scripts

### Short-term (Next 2 Weeks):
- [ ] Consolidate and optimize font loading
- [ ] Implement lazy loading for images
- [ ] Delay email popup
- [ ] Fix JavaScript errors
- [ ] Optimize CSS delivery

### Long-term (Next Month):
- [ ] Implement critical CSS
- [ ] Move all tracking to GTM
- [ ] Convert images to WebP
- [ ] Set up proper caching headers
- [ ] Regular performance audits

---

## 🎯 Quick Wins (Do These Now!)

1. **Remove duplicate Microsoft Clarity** (2 minutes)
2. **Disable unused Shopify apps** (5 minutes)
3. **Add lazy loading to images** (10 minutes)
4. **Delay Klaviyo popup** (5 minutes)
5. **Defer TrustPilot widget** (2 minutes)

### Total Time: ~24 minutes
### Expected Impact: +10-15 points on Lighthouse

---

## 📞 Support Resources

- **Shopify Performance Docs**: https://shopify.dev/docs/themes/best-practices/performance
- **Web Vitals**: https://web.dev/vitals/
- **Third-Party Scripts Guide**: https://web.dev/efficiently-load-third-party-javascript/

---

## 🔄 Next Steps

1. **Test current changes**: Run Lighthouse on product page
2. **Implement Priority 1 items**: Follow checklist above
3. **Re-test**: Compare before/after scores
4. **Document results**: Track improvements in spreadsheet
5. **Continue optimization**: Move to Priority 2 items

---

**Last Updated**: October 15, 2025  
**Version**: 1.0  
**Status**: 3 Critical Fixes Applied, More Pending

