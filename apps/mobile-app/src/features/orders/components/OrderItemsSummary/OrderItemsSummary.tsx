import React from 'react';
import { View, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { OrderItem } from '../../hooks/orders.mock';
import { stylesFactory } from './OrderItemsSummary.styles';

interface OrderItemsSummaryProps {
  items: OrderItem[];
  total: number;
}

export const OrderItemsSummary: React.FC<OrderItemsSummaryProps> = ({ items, total }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.container} testID="order-items-summary">
      <RNText style={styles.title}>{t('orders.itemsSummaryTitle')}</RNText>

      {items.map((item) => (
        <View key={item.id} style={styles.itemRow} testID={`order-item-${item.id}`}>
          <View style={styles.itemInfo}>
            <RNText style={styles.itemName}>{item.name}</RNText>
            <RNText style={styles.itemQty}>Qty: {item.qty}</RNText>
          </View>
          <RNText style={styles.itemPrice}>${item.price.toFixed(2)}</RNText>
        </View>
      ))}

      <View style={styles.totalRow}>
        <RNText style={styles.totalLabel}>{t('orders.orderTotal')}</RNText>
        <RNText style={styles.totalAmount}>${total.toFixed(2)}</RNText>
      </View>
    </View>
  );
};
