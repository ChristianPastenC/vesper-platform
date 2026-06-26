import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { Button } from '../../../../components/Button';
import { stylesFactory } from './CartFooter.styles';

export interface CartFooterProps {
  address: string;
  total: number;
  onCheckout: () => void;
  onClear: () => void;
  checkoutText: string;
  clearText: string;
  totalLabel: string;
  addressLabel: string;
}

export const CartFooter: React.FC<CartFooterProps> = ({
  address,
  total,
  onCheckout,
  onClear,
  checkoutText,
  clearText,
  totalLabel,
  addressLabel,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);

  return (
    <View style={styles.footer} testID="cart-footer">
      <View style={styles.addressSection}>
        <Text variant="bold">{addressLabel}</Text>
        <Text style={styles.addressText}>{address}</Text>
      </View>
      <View style={styles.totalSection}>
        <Text variant="bold">{totalLabel}:</Text>
        <Text variant="title" style={styles.totalText}>
          ${total.toFixed(2)}
        </Text>
      </View>
      <Button
        title={checkoutText}
        onPress={onCheckout}
        style={styles.checkoutBtn}
        testID="checkout-btn"
      />
      <Button
        title={clearText}
        variant="secondary"
        onPress={onClear}
        style={styles.clearBtn}
        testID="clear-btn"
      />
    </View>
  );
};
