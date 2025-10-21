/**
 * Content Video Section JavaScript
 * Handles video interactions and responsive behavior
 */

class ContentVideoSection {
  constructor() {
    this.section = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.section = document.querySelector('.content-video-section');
    if (!this.section) return;

    this.setupVideoInteraction();
    this.setupResponsiveBehavior();
    this.setupAccessibility();
  }

  setupVideoInteraction() {
    // Handle video embeds (YouTube/Vimeo iframes)
    const videoEmbeds = this.section?.querySelectorAll('.content-video-section__video-embed iframe');
    if (videoEmbeds && videoEmbeds.length > 0) {
      videoEmbeds.forEach(iframe => {
        iframe.addEventListener('load', () => this.handleVideoLoad(iframe));
      });
    }

    // Handle HTML5 video elements
    const videoElement = this.section?.querySelector('.content-video-section__video-element');
    if (videoElement) {
      videoElement.addEventListener('play', () => this.trackVideoPlay('html5'));
      videoElement.addEventListener('pause', () => this.trackVideoPause('html5'));
      videoElement.addEventListener('ended', () => this.trackVideoEnd('html5'));
    }

    // Handle fallback images (if someone wants to make them clickable)
    const videoImage = this.section?.querySelector('.content-video-section__video-image');
    if (videoImage) {
      // Optional: Add subtle hover effect
      videoImage.addEventListener('mouseenter', () => this.handleImageHover());
      videoImage.addEventListener('mouseleave', () => this.handleImageLeave());
    }
  }

  setupResponsiveBehavior() {
    // Handle window resize for responsive adjustments
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.handleResize(), 250);
    });
    
    // Initial responsive setup
    this.handleResize();
  }

  setupAccessibility() {
    // Add ARIA labels for better accessibility
    const title = this.section?.querySelector('.content-video-section__title');
    if (title && !title.getAttribute('role')) {
      title.setAttribute('role', 'heading');
      title.setAttribute('aria-level', '2');
    }

    const content = this.section?.querySelector('.content-video-section__content');
    if (content && !content.getAttribute('role')) {
      content.setAttribute('role', 'region');
      content.setAttribute('aria-label', 'Article content');
    }

    // Ensure iframes have proper titles for screen readers
    const iframes = this.section?.querySelectorAll('iframe');
    if (iframes) {
      iframes.forEach((iframe, index) => {
        if (!iframe.getAttribute('title')) {
          iframe.setAttribute('title', `Video player ${index + 1}`);
        }
      });
    }
  }

  // Event Handlers
  handleVideoLoad(iframe) {
    // Video iframe has loaded
    iframe.style.opacity = '1';
  }

  handleImageHover() {
    const videoImage = this.section?.querySelector('.content-video-section__video-image');
    if (videoImage) {
      videoImage.style.opacity = '0.95';
      videoImage.style.transition = 'opacity 0.3s ease';
    }
  }

  handleImageLeave() {
    const videoImage = this.section?.querySelector('.content-video-section__video-image');
    if (videoImage) {
      videoImage.style.opacity = '1';
    }
  }

  handleResize() {
    // Handle responsive behavior
    const isMobile = window.innerWidth <= 767;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 767;
    
    if (this.section) {
      this.section.classList.toggle('is-mobile', isMobile);
      this.section.classList.toggle('is-tablet', isTablet);
      this.section.classList.toggle('is-desktop', !isMobile && !isTablet);
    }
  }

  // Analytics tracking (optional - works if Google Analytics is present)
  trackVideoPlay(type) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'video_play', {
        event_category: 'engagement',
        event_label: `content_video_${type}`
      });
    }
  }

  trackVideoPause(type) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'video_pause', {
        event_category: 'engagement',
        event_label: `content_video_${type}`
      });
    }
  }

  trackVideoEnd(type) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'video_complete', {
        event_category: 'engagement',
        event_label: `content_video_${type}`
      });
    }
  }
}

// Initialize the content video section
const contentVideoSection = new ContentVideoSection();

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentVideoSection;
}
