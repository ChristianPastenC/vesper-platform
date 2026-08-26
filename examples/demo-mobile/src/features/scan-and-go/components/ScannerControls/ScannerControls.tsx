import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../../components/Button';
import { stylesFactory } from './ScannerControls.styles';

export interface ScannerControlsProps {
  itemsCount: number;
  onSimulateScan: () => void;
  onCheckout: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
  itemsCount,
  onSimulateScan,
  onCheckout,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);

  return (
    <View style={styles.controlsContainer} testID="scanner-controls">
      <View style={styles.glassBackground} />
      <Button
        title={t('scan_and_go.simulateScan')}
        leftIcon={<Ionicons name="camera-outline" size={18} color="#FFFFFF" />}
        onPress={onSimulateScan}
        style={styles.scanBtn}
        testID="simulate-scan-btn"
      />
      <Button
        title={`${t('scan_and_go.checkoutTitle')} (${itemsCount})`}
        variant="secondary"
        leftIcon={<Ionicons name="cart-outline" size={18} color={theme.colors.text} />}
        onPress={onCheckout}
        style={styles.checkoutBtn}
        testID="checkout-btn"
      />
    </View>
  );
};
