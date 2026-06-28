import React from 'react';
import { View, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInStoreCheckout } from '../hooks/useInStoreCheckout';
import { InStoreRow } from '../components/InStoreRow';
import { Text } from '../../../components/Text';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './InStoreCheckoutScreen.styles';
import { NetworkDiagnosticsCard } from '../components/NetworkDiagnosticsCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { CheckoutFooter } from '../components/CheckoutFooter';

type NavigationProp = StackNavigationProp<RootStackParamList, 'InStoreCheckoutModal'>;

export const InStoreCheckoutScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp>();
  const {
    cartItems,
    total,
    isOnline,
    toggleNetwork,
    isProcessing,
    error,
    handleCheckout,
    isAuthenticated,
    t,
  } = useInStoreCheckout();

  const handlePayPress = () => {
    if (isAuthenticated) {
      handleCheckout((orderId) => {
        navigation.navigate('PaymentSuccessScreen', {
          orderId,
          type: 'instore',
        });
      });
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <NetworkDiagnosticsCard isOnline={isOnline} onToggleNetwork={toggleNetwork} />

      <ErrorBanner error={error} />

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('scan_and_go.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          renderItem={({ item }) => <InStoreRow item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <CheckoutFooter
        total={total}
        isProcessing={isProcessing}
        cartIsEmpty={cartItems.length === 0}
        onPayPress={handlePayPress}
        onClose={() => navigation.goBack()}
      />
    </View>
  );
};
