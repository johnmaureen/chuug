import React from 'react';
import {
  reactExtension,
  Banner,
  Text,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutBannerExtension />
);

function CheckoutBannerExtension() {
  return (
    <Banner
      status="warning"
      title="Warning"
      onDismiss={() => console.log('Banner dismissed')}
    >
      <Text>We're currently going viral, so due to high demand, we can only reserve your order for 10 more minutes, Production capacity almost reached.</Text>
    </Banner>
  );
}