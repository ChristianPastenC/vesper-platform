import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../../navigation/types';
import { useTheme } from '../../../../core/theme/useTheme';
import { useOrders } from '../../hooks/useOrders';
import { FilterTabs } from '../../components/FilterTabs/FilterTabs';
import { OrdersList } from '../../components/OrdersList/OrdersList';
import { stylesFactory } from './OrdersScreen.styles';

export const OrdersScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { activeOrders, pastOrders } = useOrders();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const currentOrders = activeTab === 'active' ? activeOrders : pastOrders;
  const emptyMessageKey = activeTab === 'active' ? 'orders.emptyActive' : 'orders.emptyPast';

  return (
    <View style={styles.container}>
      <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <OrdersList
        orders={currentOrders}
        emptyMessageKey={emptyMessageKey}
        onOrderPress={handleOrderPress}
      />
    </View>
  );
};
