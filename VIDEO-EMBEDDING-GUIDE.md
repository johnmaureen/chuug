# Video Embedding Guide for Content Video Section

## How to Embed Videos

Your content video section supports multiple ways to embed videos:

### 1. **YouTube/Vimeo Embed (Recommended)**

**Steps:**
1. Go to your YouTube or Vimeo video
2. Copy the video URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
3. In the theme customizer, paste the URL in the "Video URL or Embed Code" field
4. The video will automatically embed with proper responsive behavior

**Example URLs:**
- YouTube: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` or `https://youtu.be/dQw4w9WgXcQ`
- Vimeo: `https://vimeo.com/123456789`

**Supported URL Formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://vimeo.com/VIDEO_ID`

### 2. **Direct Embed Code**

**Steps:**
1. Go to your video platform (YouTube, Vimeo, etc.)
2. Click "Share" → "Embed"
3. Copy the entire iframe code
4. Paste it in the "Video URL or Embed Code" field

**Example Embed Code:**
```html
<iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
```

### 3. **Direct Video File**

**Steps:**
1. Upload your video file to Shopify's Files section or external hosting
2. Copy the direct video file URL
3. Paste it in the "Video File URL" field
4. Optionally add a poster image for better loading experience

**Supported formats:** MP4, WebM, OGG

### 4. **Fallback Image**

If no video is provided, the section will display the fallback image you've set.

## Video Settings Explained

- **Video URL or Embed Code**: For YouTube/Vimeo URLs or direct iframe embed codes
- **Video File URL**: For direct video file links
- **Video Poster Image**: Thumbnail shown before video plays
- **Fallback Image**: Static image when no video is available

## Best Practices

1. **Use YouTube/Vimeo** for best performance and compatibility
2. **Add poster images** for faster loading
3. **Keep videos under 100MB** for direct file uploads
4. **Test on mobile devices** to ensure responsive behavior
5. **Use direct embed codes** for custom video players or special requirements

## Technical Notes

- Videos maintain 16:9 aspect ratio
- Automatic responsive scaling
- Built-in video controls
- SEO-friendly implementation
- Accessibility features included
- Lazy loading for better performance
- Mobile-optimized with `playsinline` attribute
