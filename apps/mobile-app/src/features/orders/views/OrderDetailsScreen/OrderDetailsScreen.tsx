import React from 'react';
import { View, ScrollView, Text as RNText } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../../../navigation/types';
import { useTheme } from '../../../../core/theme/useTheme';
import { useOrders } from '../../hooks/useOrders';
import { OrderTimeline } from '../../components/OrderTimeline/OrderTimeline';
import { OrderItemsSummary } from '../../components/OrderItemsSummary/OrderItemsSummary';
import { stylesFactory } from './OrderDetailsScreen.styles';

type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'OrderDetails'>;

export const OrderDetailsScreen: React.FC = () => {
  const route = useRoute<OrderDetailsRouteProp>();
  const { orderId } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const { getOrderById } = useOrders();
  const order = getOrderById(orderId);

  if (!order) {
    return (
      <View style={styles.container}>
        <RNText style={styles.errorText}>Order not found.</RNText>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
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

  const getStatusTranslation = (status: string) => {
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <RNText
              style={styles.orderIdText}
            >{`${t('orders.orderId')}${order.id.split('-')[1]}`}</RNText>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <RNText style={[styles.statusText, { color: statusColor }]}>
                {getStatusTranslation(order.status)}
              </RNText>
            </View>
          </View>
          <RNText style={styles.dateText}>{`${t('orders.orderDate')}${formattedDate}`}</RNText>
        </View>

        <OrderTimeline events={order.timeline} />
        <OrderItemsSummary items={order.items} total={order.total} />
      </ScrollView>
    </View>
  );
};
