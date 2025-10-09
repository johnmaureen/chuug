import React from 'react';
import {
  reactExtension,
  View,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  useSettings,
  Image,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <ReviewBlockExtension />
);

function ReviewBlockExtension() {
  const settings = useSettings();

  const reviewTitle = settings.review_title || 'Loving our CHUUG!';
  const reviewDate = settings.review_date || 'September 18, 2025';
  const reviewContent = settings.review_content || 'Loving our CHUUG!! These are beautiful. They came in a gorgeous box and the bag is really nice as well. I would order 2 more if they make them in a larger size as well.';
  const reviewAuthor = settings.review_author || 'Marcy H. from US';

  return (
    <View padding="base" border="base" cornerRadius="base">
      <BlockStack spacing="tight">
        <Image source="https://cdn.shopify.com/s/files/1/0799/4307/4111/files/quote.svg?v=1760006842" />
        

        {/* Title */}
        <Text size="large" emphasis="bold">
          {reviewTitle}
        </Text>

        {/* Stars and Date */}
        <InlineStack spacing="base" alignment="leading">
        <Image source="https://cdn.shopify.com/s/files/1/0799/4307/4111/files/Stars.svg?v=1760006926" />
          <Text size="small" appearance="subdued">
            {reviewDate}
          </Text>
        </InlineStack>

        {/* Review Content */}
        <Text size="base">
          {reviewContent}
        </Text>

        {/* Divider */}
        <Divider />

        {/* Author */}
        <Text size="base" appearance="subdued" emphasis="bold">
          {reviewAuthor}
        </Text>
      </BlockStack>
    </View>
  );
}

