/**
 * Content Video Section JavaScript
 * Handles video interactions, email form submission, and responsive behavior
 */

class ContentVideoSection {
  constructor() {
    this.section = null;
    this.emailForm = null;
    this.countryDropdown = null;
    this.socialLink = null;
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

    this.setupEmailForm();
    this.setupCountryDropdown();
    this.setupSocialLink();
    this.setupVideoInteraction();
    this.setupResponsiveBehavior();
    this.setupAccessibility();
  }

  setupEmailForm() {
    this.emailForm = this.section?.querySelector('.content-video-section__email-form');
    if (!this.emailForm) return;

    this.emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
    
    // Add focus/blur effects
    const emailInput = this.emailForm.querySelector('.content-video-section__email-input');
    if (emailInput) {
      emailInput.addEventListener('focus', () => this.handleEmailFocus());
      emailInput.addEventListener('blur', () => this.handleEmailBlur());
    }
  }

  setupCountryDropdown() {
    this.countryDropdown = this.section?.querySelector('.content-video-section__country-dropdown');
    if (!this.countryDropdown) return;

    this.countryDropdown.addEventListener('click', () => this.handleCountryClick());
    this.countryDropdown.addEventListener('keydown', (e) => this.handleCountryKeydown(e));
    
    // Make it focusable
    this.countryDropdown.setAttribute('tabindex', '0');
    this.countryDropdown.setAttribute('role', 'button');
    this.countryDropdown.setAttribute('aria-label', 'Select country/region');
  }

  setupSocialLink() {
    this.socialLink = this.section?.querySelector('.content-video-section__social-link');
    if (!this.socialLink) return;

    this.socialLink.addEventListener('click', (e) => this.handleSocialClick(e));
  }

  setupVideoInteraction() {
    const videoImage = this.section?.querySelector('.content-video-section__video-image');
    if (!videoImage) return;

    // Add click handler for potential video play functionality
    videoImage.addEventListener('click', () => this.handleVideoClick());
    
    // Add hover effects
    videoImage.addEventListener('mouseenter', () => this.handleVideoHover());
    videoImage.addEventListener('mouseleave', () => this.handleVideoLeave());
    
    // Make it focusable for accessibility
    videoImage.setAttribute('tabindex', '0');
    videoImage.setAttribute('role', 'button');
    videoImage.setAttribute('aria-label', 'Play video');
  }

  setupResponsiveBehavior() {
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Initial responsive setup
    this.handleResize();
  }

  setupAccessibility() {
    // Add ARIA labels and roles
    const title = this.section?.querySelector('.content-video-section__title');
    if (title) {
      title.setAttribute('role', 'heading');
      title.setAttribute('aria-level', '2');
    }

    const content = this.section?.querySelector('.content-video-section__content');
    if (content) {
      content.setAttribute('role', 'region');
      content.setAttribute('aria-label', 'Article content');
    }

    // Add keyboard navigation support
    this.section?.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
  }

  // Event Handlers
  handleEmailSubmit(e) {
    e.preventDefault();
    
    const emailInput = this.emailForm.querySelector('.content-video-section__email-input');
    const email = emailInput?.value.trim();
    
    if (!email || !this.isValidEmail(email)) {
      this.showEmailError('Please enter a valid email address');
      return;
    }

    // Simulate form submission
    this.showEmailSuccess('Thank you for subscribing!');
    
    // Reset form
    emailInput.value = '';
    
    // Track analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'email_signup', {
        event_category: 'engagement',
        event_label: 'content_video_section'
      });
    }
  }

  handleEmailFocus() {
    this.emailForm?.classList.add('focused');
  }

  handleEmailBlur() {
    this.emailForm?.classList.remove('focused');
  }

  handleCountryClick() {
    // Simulate country dropdown functionality
    this.showCountryModal();
  }

  handleCountryKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleCountryClick();
    }
  }

  handleSocialClick(e) {
    e.preventDefault();
    
    // Track social media click
    if (typeof gtag !== 'undefined') {
      gtag('event', 'social_click', {
        event_category: 'engagement',
        event_label: 'shop_follow'
      });
    }
    
    // Open social media link (you can customize this URL)
    window.open('https://shop.app', '_blank', 'noopener,noreferrer');
  }

  handleVideoClick() {
    // Add video play functionality if needed
    console.log('Video clicked - implement video play functionality');
    
    // Track video interaction
    if (typeof gtag !== 'undefined') {
      gtag('event', 'video_interaction', {
        event_category: 'engagement',
        event_label: 'content_video_click'
      });
    }
  }

  handleVideoHover() {
    const videoImage = this.section?.querySelector('.content-video-section__video-image');
    if (videoImage) {
      videoImage.style.transform = 'scale(1.02)';
      videoImage.style.transition = 'transform 0.3s ease';
    }
  }

  handleVideoLeave() {
    const videoImage = this.section?.querySelector('.content-video-section__video-image');
    if (videoImage) {
      videoImage.style.transform = 'scale(1)';
    }
  }

  handleResize() {
    // Handle responsive behavior
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1200 && window.innerWidth > 768;
    
    this.section?.classList.toggle('mobile', isMobile);
    this.section?.classList.toggle('tablet', isTablet);
    
    // Adjust email form layout for mobile
    const emailForm = this.section?.querySelector('.content-video-section__email-form');
    if (emailForm) {
      if (isMobile) {
        emailForm.style.flexDirection = 'column';
        emailForm.style.gap = '15px';
      } else {
        emailForm.style.flexDirection = 'row';
        emailForm.style.gap = '240px';
      }
    }
  }

  handleKeyboardNavigation(e) {
    // Handle keyboard navigation within the section
    if (e.key === 'Tab') {
      // Ensure proper tab order
      this.ensureTabOrder();
    }
  }

  // Utility Methods
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showEmailError(message) {
    this.showNotification(message, 'error');
  }

  showEmailSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `content-video-section__notification content-video-section__notification--${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-family: 'Gabarito', sans-serif;
      font-size: 14px;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      ${type === 'error' ? 'background-color: #e74c3c;' : 'background-color: #27ae60;'}
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  showCountryModal() {
    // Simulate country selection modal
    const modal = document.createElement('div');
    modal.className = 'content-video-section__country-modal';
    modal.innerHTML = `
      <div class="content-video-section__modal-content">
        <h3>Select Country/Region</h3>
        <div class="content-video-section__country-list">
          <div class="content-video-section__country-option" data-country="GBP £ | United Kingdom">GBP £ | United Kingdom</div>
          <div class="content-video-section__country-option" data-country="USD $ | United States">USD $ | United States</div>
          <div class="content-video-section__country-option" data-country="EUR € | European Union">EUR € | European Union</div>
          <div class="content-video-section__country-option" data-country="CAD $ | Canada">CAD $ | Canada</div>
        </div>
        <button class="content-video-section__modal-close">Close</button>
      </div>
    `;
    
    // Add modal styles
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    const modalContent = modal.querySelector('.content-video-section__modal-content');
    modalContent.style.cssText = `
      background-color: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
      text-align: center;
    `;
    
    document.body.appendChild(modal);
    
    // Handle country selection
    modal.querySelectorAll('.content-video-section__country-option').forEach(option => {
      option.addEventListener('click', () => {
        const countryText = this.section?.querySelector('.content-video-section__country-text');
        if (countryText) {
          countryText.textContent = option.dataset.country;
        }
        document.body.removeChild(modal);
      });
    });
    
    // Handle close
    modal.querySelector('.content-video-section__modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  ensureTabOrder() {
    // Ensure proper tab order for accessibility
    const focusableElements = this.section?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements) {
      focusableElements.forEach((element, index) => {
        element.setAttribute('tabindex', index + 1);
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
