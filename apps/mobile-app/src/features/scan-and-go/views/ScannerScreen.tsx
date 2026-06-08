import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScanner } from '../hooks/useScanner';
import { useAppStore } from '../../../store/useAppStore';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './ScannerScreen.styles';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export const ScannerScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp>();
  const { lastScanned, simulateScan, t } = useScanner();

  const itemsCount = useAppStore((state) =>
    state.inStoreCart.reduce((acc, item) => acc + item.quantity, 0),
  );

  const handleCheckoutPress = () => {
    navigation.navigate('InStoreCheckoutModal');
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewfinderContainer}>
        <View style={styles.darkOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.darkOverlay} />
          <View style={styles.viewfinderFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={styles.laserLine} />
          </View>
          <View style={styles.darkOverlay} />
        </View>
        <View style={styles.darkOverlay} />

        <View style={styles.overlayTextContainer}>
          <Text variant="bold" style={styles.scanHint}>
            {t('scan_and_go.scanHint')}
          </Text>
          {lastScanned && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>
                {t('catalog.itemAdded')}: {lastScanned}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <Button
          title={t('scan_and_go.simulateScan')}
          leftIcon={<Ionicons name="camera-outline" size={18} color="#FFFFFF" />}
          onPress={simulateScan}
          style={styles.scanBtn}
        />
        <Button
          title={`${t('scan_and_go.checkoutTitle')} (${itemsCount})`}
          variant="secondary"
          leftIcon={<Ionicons name="cart-outline" size={18} color={theme.colors.text} />}
          onPress={handleCheckoutPress}
          style={styles.checkoutBtn}
        />
      </View>
    </View>
  );
};
