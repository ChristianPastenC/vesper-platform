import React from 'react';
import { View, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnlineCart } from '../hooks/useOnlineCart';
import { OnlineRow } from '../components/OnlineRow';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './OnlineCartScreen.styles';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export const OnlineCartScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp>();
  const { cartItems, total, address, clearCart, isAuthenticated, t } = useOnlineCart();

  const handleCheckoutPress = () => {
    if (isAuthenticated) {
      navigation.navigate('OnlineCheckoutModal');
    } else {
      navigation.navigate('Login');
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('online_checkout.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cartItems}
        renderItem={({ item }) => <OnlineRow item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.footer}>
        <View style={styles.addressSection}>
          <Text variant="bold">{t('online_checkout.deliveryAddress')}</Text>
          <Text style={styles.addressText}>{address}</Text>
        </View>
        <View style={styles.totalSection}>
          <Text variant="bold">{t('online_checkout.total')}:</Text>
          <Text variant="title" style={styles.totalText}>
            ${total.toFixed(2)}
          </Text>
        </View>
        <Button
          title={t('online_checkout.checkoutButton')}
          onPress={handleCheckoutPress}
          style={styles.checkoutBtn}
        />
        <Button
          title={t('shared_ui.close')}
          variant="secondary"
          onPress={clearCart}
          style={styles.clearBtn}
        />
      </View>
    </View>
  );
};
