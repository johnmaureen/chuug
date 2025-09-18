import React from 'react';
import {
  reactExtension,
  Banner,
  Button,
  Text,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <InfoBanner />
);

function InfoBanner() {
  return (
    <Banner
      status="info"
      title="Shipping information"
      collapsible={true}
      onDismiss={() => console.log('Info banner dismissed')}
    >
      <Text>
        Your order will be processed within 1-2 business days and shipped via standard delivery.
      </Text>
      <div style={{ marginTop: '8px' }}>
        <Text size="small">
          • Standard shipping: 3-5 business days
          • Express shipping: 1-2 business days (available at checkout)
          • International shipping: 7-14 business days
        </Text>
      </div>
      <div style={{ marginTop: '8px' }}>
        <Button
          kind="secondary"
          onPress={() => {
            // Action to view shipping options or contact support
            console.log('View shipping options clicked');
          }}
        >
          View Shipping Options
        </Button>
      </div>
    </Banner>
  );
}
