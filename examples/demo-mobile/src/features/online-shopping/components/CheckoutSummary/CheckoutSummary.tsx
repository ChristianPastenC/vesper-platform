import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './CheckoutSummary.styles';

export interface CheckoutSummaryProps {
  total: number;
  totalLabel: string;
  isProcessing: boolean;
  processingMessage: string;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  total,
  totalLabel,
  isProcessing,
  processingMessage,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <>
      <View style={styles.card} testID="checkout-summary-card">
        <Text variant="bold" style={styles.label}>
          {totalLabel}
        </Text>
        <Text variant="title" style={styles.price}>
          ${total.toFixed(2)}
        </Text>
      </View>
      {isProcessing && (
        <View style={styles.loaderSection} testID="processing-section">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>{processingMessage}</Text>
        </View>
      )}
    </>
  );
};
