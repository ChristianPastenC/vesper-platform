import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../../components/Text';
import { Button } from '../../../../components/Button';
import { stylesFactory } from './CheckoutFooter.styles';

export interface CheckoutFooterProps {
  total: number;
  isProcessing: boolean;
  cartIsEmpty: boolean;
  onPayPress: () => void;
  onClose: () => void;
}

export const CheckoutFooter: React.FC<CheckoutFooterProps> = ({
  total,
  isProcessing,
  cartIsEmpty,
  onPayPress,
  onClose,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);

  return (
    <View style={styles.footer} testID="checkout-footer">
      <View style={styles.totalSection}>
        <Text variant="bold">{t('scan_and_go.total')}:</Text>
        <Text variant="title" style={styles.totalText}>
          ${total.toFixed(2)}
        </Text>
      </View>
      <Button
        title={t('scan_and_go.payButton')}
        status={isProcessing ? 'loading' : cartIsEmpty ? 'disabled' : 'idle'}
        onPress={onPayPress}
        style={styles.payBtn}
        testID="pay-btn"
      />
      <Button
        title={t('shared_ui.close')}
        variant="secondary"
        disabled={isProcessing}
        onPress={onClose}
        testID="close-btn"
      />
    </View>
  );
};
