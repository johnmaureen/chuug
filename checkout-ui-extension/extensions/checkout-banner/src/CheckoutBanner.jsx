import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  Text,
  BlockStack,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutBannerExtension />
);

function CheckoutBannerExtension() {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <BlockStack spacing="base">
      {/* Warning Banner */}
      <Banner
        status="warning"
        title="Warning"
      >
        <Text>We're currently going viral, so due to high demand, we can only reserve your order for 10 more minutes, Production capacity almost reached.</Text>
      </Banner>

      {/* Success Banner */}
      <Banner
        status="success"
      >
        <Text>Your order has been reserved for the next {formatTime(timeLeft)}</Text>
      </Banner>
    </BlockStack>
  );
}