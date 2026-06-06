import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../core/theme/useTheme';
import { useOnlineCart } from '../hooks/useOnlineCart';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './OnlineCheckoutModal.styles';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'OnlineCheckoutModal'
>;

export const OnlineCheckoutModal: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp>();
  const { total, address, isProcessing, handleCheckout, t } = useOnlineCart();

  const handleConfirmOrder = () => {
    handleCheckout((orderId) => {
      navigation.navigate('PaymentSuccessScreen', {
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
        <View style={styles.card}>
          <Text variant="bold" style={styles.label}>
            {t('online_checkout.deliveryAddress')}
          </Text>
          <Text style={styles.value}>{address}</Text>
        </View>
        <View style={styles.card}>
          <Text variant="bold" style={styles.label}>
            {t('online_checkout.total')}
          </Text>
          <Text variant="title" style={styles.price}>
            ${total.toFixed(2)}
          </Text>
        </View>
        {isProcessing && (
          <View style={styles.loaderSection}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>
              {t('online_checkout.processing')}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Button
          title={t('online_checkout.checkoutButton')}
          status={isProcessing ? 'loading' : 'idle'}
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
