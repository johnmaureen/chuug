import React, { useState } from 'react';
import {
  reactExtension,
  Banner,
  Button,
  Text,
  useSettings,
  useApplyAttributeChange,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutBannerExtension />
);

function CheckoutBannerExtension() {
  const settings = useSettings();
  const applyAttributeChange = useApplyAttributeChange();
  
  // Get settings from the extension configuration
  const bannerType = settings.banner_type || 'info';
  const bannerTitle = settings.banner_title || 'Important Information';
  const bannerMessage = settings.banner_message || 'This is an important message for your customers.';
  const isDismissible = settings.is_dismissible !== false;
  const isCollapsible = settings.is_collapsible === true;
  
  // State management for banner visibility and collapse
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Handle banner dismissal
  const handleDismiss = () => {
    setIsVisible(false);
    // You can also apply an attribute to track that the banner was dismissed
    applyAttributeChange({
      type: 'updateAttribute',
      key: 'banner_dismissed',
      value: 'true',
    });
  };
  
  // Handle banner collapse/expand
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Don't render if banner is dismissed
  if (!isVisible) {
    return null;
  }
  
  return (
    <Banner
      id="checkout-banner"
      status={bannerType}
      title={bannerTitle}
      collapsible={isCollapsible}
      onDismiss={isDismissible ? handleDismiss : undefined}
    >
      <Text>{bannerMessage}</Text>
      
      {/* Example of additional content that can be collapsed */}
      {isCollapsible && !isCollapsed && (
        <div style={{ marginTop: '8px' }}>
          <Text size="small">
            This is additional information that can be collapsed. 
            You can add more detailed content here.
          </Text>
          <Button
            kind="plain"
            onPress={handleToggleCollapse}
            style={{ marginTop: '4px' }}
          >
            Show less
          </Button>
        </div>
      )}
      
      {isCollapsible && isCollapsed && (
        <Button
          kind="plain"
          onPress={handleToggleCollapse}
          style={{ marginTop: '4px' }}
        >
          Show more
        </Button>
      )}
      
      {/* Example action button */}
      <div style={{ marginTop: '8px' }}>
        <Button
          kind="secondary"
          onPress={() => {
            // Example action - you can customize this
            console.log('Banner action clicked');
          }}
        >
          Learn More
        </Button>
      </div>
    </Banner>
  );
}
