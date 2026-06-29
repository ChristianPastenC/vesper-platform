import React from 'react';
import { View, TouchableOpacity, Text as RNText, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { Order } from '../../hooks/useOrders';
import { stylesFactory } from './OrderListItem.styles';

interface OrderListItemProps {
  order: Order;
  onPress: (orderId: string) => void;
}

export const OrderListItem: React.FC<OrderListItemProps> = ({ order, onPress }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return '#FFA000';
      case 'shipped':
        return '#2196F3';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return theme.colors.text;
    }
  };

  const getStatusTranslation = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return t('orders.statusProcessing');
      case 'shipped':
        return t('orders.statusShipped');
      case 'delivered':
        return t('orders.statusDelivered');
      case 'cancelled':
        return t('orders.statusCancelled');
      default:
        return status;
    }
  };

  const statusColor = getStatusColor(order.status);
  const formattedDate = new Date(order.date).toLocaleDateString();
  const itemsCount = order.items.reduce((acc, item) => acc + item.qty, 0);

  // Take up to 3 images to display in the thumbnail list
  const itemImages = order.items
    .filter((i) => !!i.image)
    .map((i) => i.image)
    .slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(order.id)}
      testID={`order-item-${order.id}`}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <RNText style={styles.orderId}>{`${t('orders.orderId')}${order.id.split('-')[1]}`}</RNText>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <RNText style={[styles.statusText, { color: statusColor }]}>
            {getStatusTranslation(order.status)}
          </RNText>
        </View>
      </View>

      <RNText style={styles.itemsCount}>{`${itemsCount} item${itemsCount > 1 ? 's' : ''}`}</RNText>

      {itemImages.length > 0 && (
        <View style={styles.imagesContainer}>
          {itemImages.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.itemImage} />
          ))}
        </View>
      )}

      <View style={styles.detailsRow}>
        <RNText style={styles.dateText}>{`${t('orders.orderDate')}${formattedDate}`}</RNText>
        <RNText style={styles.totalText}>${order.total.toFixed(2)}</RNText>
      </View>
    </TouchableOpacity>
  );
};
