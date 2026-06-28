import React from 'react';
import { FlatList, View, Text as RNText } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { Order } from '../../hooks/useOrders';
import { OrderListItem } from '../OrderListItem/OrderListItem';
import { stylesFactory } from './OrdersList.styles';

interface OrdersListProps {
  orders: Order[];
  emptyMessageKey: string;
  onOrderPress: (orderId: string) => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  emptyMessageKey,
  onOrderPress,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer} testID="empty-orders-state">
      <Ionicons
        name="receipt-outline"
        size={64}
        color={theme.colors.text}
        style={{ opacity: 0.2 }}
      />
      <RNText style={styles.emptyText}>{t(emptyMessageKey)}</RNText>
    </View>
  );

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <OrderListItem order={item} onPress={onOrderPress} />}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmptyComponent}
      showsVerticalScrollIndicator={false}
      testID="orders-list"
    />
  );
};
