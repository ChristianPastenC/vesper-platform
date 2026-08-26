import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../core/theme/useTheme';
import { useOnlineCart } from '../hooks/useOnlineCart';
import { RootStackParamList } from '../../../navigation/types';
import { OnlineCartList } from '../components/OnlineCartList';
import { CartFooter } from '../components/CartFooter';
import { stylesFactory } from './OnlineCartScreen.styles';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export const OnlineCartScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp>();
  const { cartItems, total, address, clearCart, isAuthenticated, t } = useOnlineCart();

  const handleCheckoutPress = () => {
    if (isAuthenticated) {
      navigation.navigate('OnlineCheckoutModal');
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <OnlineCartList cartItems={cartItems} emptyMessage={t('online_checkout.empty')} />
      {cartItems.length > 0 && (
        <CartFooter
          address={address}
          total={total}
          onCheckout={handleCheckoutPress}
          onClear={clearCart}
          checkoutText={t('online_checkout.checkoutButton')}
          clearText={t('shared_ui.close')}
          totalLabel={t('online_checkout.total')}
          addressLabel={t('online_checkout.deliveryAddress')}
          emptyAddressText={t('online_checkout.addressEmpty')}
        />
      )}
    </View>
  );
};
