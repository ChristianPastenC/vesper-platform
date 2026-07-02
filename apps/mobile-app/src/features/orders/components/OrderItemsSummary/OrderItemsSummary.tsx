import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { OrderItem } from '../../hooks/useOrders';
import { stylesFactory } from './OrderItemsSummary.styles';
import { Text } from '../../../../components/Text';

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
      <Text style={styles.title}>{t('orders.itemsSummaryTitle')}</Text>

      {items.map((item) => (
        <View key={item.id} style={styles.itemRow} testID={`order-item-${item.id}`}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.title}</Text>
            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
          </View>
          <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('orders.orderTotal')}</Text>
        <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
      </View>
    </View>
  );
};
