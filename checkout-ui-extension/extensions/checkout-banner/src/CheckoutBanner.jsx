import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  Text,
  useSettings,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutBannerExtension />
);

function CheckoutBannerExtension() {
  const settings = useSettings();
  const [timeLeft, setTimeLeft] = useState(600); // Default 10 minutes

  // Get settings from the extension configuration
  const bannerStatus = settings.banner_status || 'warning';
  const bannerTitle = settings.banner_title || '';
  const bannerMessage = settings.banner_message || 'We\'re currently going viral, so due to high demand, we can only reserve your order for 10 more minutes, Production capacity almost reached.';
  const showCountdown = settings.show_countdown === true;
  const countdownDuration = parseInt(settings.countdown_duration) || 600;
  const isDismissible = settings.is_dismissible === true;

  // Initialize countdown with the configured duration
  useEffect(() => {
    setTimeLeft(countdownDuration);
  }, [countdownDuration]);

  useEffect(() => {
    if (!showCountdown) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showCountdown]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Build the final message
  const getFinalMessage = () => {
    if (showCountdown) {
      return `${bannerMessage} ${formatTime(timeLeft)}`;
    }
    return bannerMessage;
  };

  // Create banner props conditionally
  const bannerProps = {
    status: bannerStatus,
    onDismiss: isDismissible ? () => console.log('Banner dismissed') : undefined,
  };

  // Only add title if it has content
  if (bannerTitle && bannerTitle.trim() !== '') {
    bannerProps.title = bannerTitle;
  }

  return (
    <Banner {...bannerProps}>
      <Text>{getFinalMessage()}</Text>
    </Banner>
  );
}
