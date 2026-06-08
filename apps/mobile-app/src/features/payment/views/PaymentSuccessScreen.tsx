import React from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './PaymentSuccessScreen.styles';

type RoutePropType = RouteProp<RootStackParamList, 'PaymentSuccessScreen'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'PaymentSuccessScreen'>;

export const PaymentSuccessScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { orderId, type } = route.params;

  const handleReturnToCatalog = () => {
    navigation.popToTop();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkmarkCircle}>
          <Ionicons name="checkmark-circle-outline" size={60} color="#FFFFFF" />
        </View>
        <Text variant="title" style={styles.successTitle}>
          {type === 'online' ? t('online_checkout.success') : t('scan_and_go.success')}
        </Text>
        <Text variant="caption" style={styles.orderLabel}>
          Order ID
        </Text>
        <Text variant="bold" style={styles.orderId}>
          {orderId}
        </Text>

        {type === 'instore' && (
          <View style={styles.qrMockContainer}>
            <View style={styles.qrBox}>
              <View style={styles.qrRow}>
                <View style={[styles.qrDot, styles.qrActive]} />
                <View style={styles.qrDot} />
                <View style={[styles.qrDot, styles.qrActive]} />
                <View style={styles.qrDot} />
              </View>
              <View style={styles.qrRow}>
                <View style={styles.qrDot} />
                <View style={[styles.qrDot, styles.qrActive]} />
                <View style={styles.qrDot} />
                <View style={[styles.qrDot, styles.qrActive]} />
              </View>
              <View style={styles.qrRow}>
                <View style={[styles.qrDot, styles.qrActive]} />
                <View style={styles.qrDot} />
                <View style={styles.qrDot} />
                <View style={[styles.qrDot, styles.qrActive]} />
              </View>
            </View>
            <Text variant="caption" style={styles.qrHint}>
              Exit Gate QR Code
            </Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Button title="Return to Catalog" onPress={handleReturnToCatalog} style={styles.doneBtn} />
      </View>
    </View>
  );
};
