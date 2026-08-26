import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScanner } from '../hooks/useScanner';
import { useAppStore } from '../../../store/useAppStore';
import { Text } from '../../../components/Text';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './ScannerScreen.styles';
import { CameraView } from 'expo-camera';
import { ViewfinderOverlay } from '../components/ViewfinderOverlay';
import { ScannerControls } from '../components/ScannerControls';
import { ScanToast } from '../components/ScanToast';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export const ScannerScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp>();
  const { lastScanned, simulateScan, onBarcodeScanned, hasPermission, requestPermission, t } =
    useScanner();

  const itemsCount = useAppStore((state) =>
    state.inStoreCart.reduce((acc, item) => acc + item.quantity, 0),
  );

  const handleCheckoutPress = () => {
    navigation.navigate('InStoreCheckoutModal');
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'],
        }}
      >
        <ViewfinderOverlay hasPermission={hasPermission} requestPermission={requestPermission} />

        <View style={styles.overlayTextContainer} pointerEvents="none">
          <Text variant="bold" style={styles.scanHint}>
            {t('scan_and_go.scanHint')}
          </Text>
          <ScanToast lastScanned={lastScanned} />
        </View>
      </CameraView>

      <ScannerControls
        itemsCount={itemsCount}
        onSimulateScan={simulateScan}
        onCheckout={handleCheckoutPress}
      />
    </View>
  );
};
