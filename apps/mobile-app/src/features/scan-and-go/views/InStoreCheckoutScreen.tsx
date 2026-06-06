import React from 'react';
import { View, FlatList, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInStoreCheckout } from '../hooks/useInStoreCheckout';
import { InStoreRow } from '../components/InStoreRow';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './InStoreCheckoutScreen.styles';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'InStoreCheckoutModal'
>;

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
      <View style={styles.networkToggleCard}>
        <Ionicons
          name={isOnline ? 'wifi' : 'wifi-outline'}
          size={24}
          color={isOnline ? theme.colors.success : theme.colors.error}
          style={styles.networkIcon}
        />
        <View style={styles.networkInfo}>
          <Text variant="bold">{t('scan_and_go.networkStatus')}</Text>
          <Text style={styles.networkStatusLabel}>
            {isOnline
              ? t('scan_and_go.onlineLabel')
              : t('scan_and_go.offlineLabel')}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleNetwork}
          trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
          thumbColor={isOnline ? theme.colors.primary : '#f4f3f4'}
          testID="network-switch"
        />
      </View>

      {error && (
        <View style={styles.errorBanner} testID="error-banner">
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={theme.colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{t('scan_and_go.error503')}</Text>
        </View>
      )}

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

      <View style={styles.footer}>
        <View style={styles.totalSection}>
          <Text variant="bold">{t('scan_and_go.total')}:</Text>
          <Text variant="title" style={styles.totalText}>
            ${total.toFixed(2)}
          </Text>
        </View>
        <Button
          title={t('scan_and_go.payButton')}
          status={
            isProcessing
              ? 'loading'
              : cartItems.length === 0
                ? 'disabled'
                : 'idle'
          }
          onPress={handlePayPress}
          style={styles.payBtn}
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
