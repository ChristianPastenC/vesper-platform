import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../core/theme/useTheme';
import { useOnlineCart } from '../hooks/useOnlineCart';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { RootStackParamList } from '../../../navigation/types';
import { DeliveryAddressCard } from '../components/DeliveryAddressCard';
import { CheckoutSummary } from '../components/CheckoutSummary';
import { stylesFactory } from './OnlineCheckoutModal.styles';

type NavigationProp = StackNavigationProp<RootStackParamList, 'OnlineCheckoutModal'>;

export const OnlineCheckoutModal: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp>();
  const { total, address, setAddress, isProcessing, handleCheckout, t } = useOnlineCart();

  const handleConfirmOrder = () => {
    handleCheckout((orderId) => {
      navigation.replace('PaymentSuccessScreen', {
        orderId,
        type: 'online',
      });
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="title" style={styles.title}>
          {t('online_checkout.title')}
        </Text>
        <DeliveryAddressCard 
          label={t('online_checkout.deliveryAddress')} 
          address={address} 
          onChangeAddress={setAddress}
          placeholderText={t('online_checkout.addressPlaceholder')}
          emptyText={t('online_checkout.addressEmpty')}
        />
        <CheckoutSummary
          total={total}
          totalLabel={t('online_checkout.total')}
          isProcessing={isProcessing}
          processingMessage={t('online_checkout.processing')}
        />
      </View>
      <View style={styles.footer}>
        <Button
          title={t('online_checkout.checkoutButton')}
          status={isProcessing ? 'loading' : 'idle'}
          disabled={!address.trim() || isProcessing}
          onPress={handleConfirmOrder}
          style={styles.confirmBtn}
        />
        <Button
          title={t('shared_ui.close')}
          variant="secondary"
          disabled={isProcessing}
          onPress={() => navigation.goBack()}
        />
      </View>
    </View>
  );
};
