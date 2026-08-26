import { stylesFactory as checkoutFooterStyles } from './features/scan-and-go/components/CheckoutFooter/CheckoutFooter.styles';
import { stylesFactory as networkCardStyles } from './features/scan-and-go/components/NetworkDiagnosticsCard/NetworkDiagnosticsCard.styles';
import { stylesFactory as scanToastStyles } from './features/scan-and-go/components/ScanToast/ScanToast.styles';
import { stylesFactory as scannerControlsStyles } from './features/scan-and-go/components/ScannerControls/ScannerControls.styles';
import { stylesFactory as viewfinderStyles } from './features/scan-and-go/components/ViewfinderOverlay/ViewfinderOverlay.styles';
import { stylesFactory as inStoreCheckoutStyles } from './features/scan-and-go/views/InStoreCheckoutScreen.styles';
import { stylesFactory as scannerScreenStyles } from './features/scan-and-go/views/ScannerScreen.styles';
import { stylesFactory as tabNavigatorStyles } from './navigation/TabNavigator/TabNavigator.styles';
import { ThemeColors } from './core/theme/colors';

const mockColors: ThemeColors = {
  primary: '#10B981',
  success: '#10B981',
  error: '#EF4444',
  text: '#000000',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  background: '#FFFFFF',
};

describe('Styles Branch Coverage', () => {
  it('should generate styles without insets to cover undefined branches', () => {
    expect(checkoutFooterStyles(mockColors)).toBeDefined();
    expect(networkCardStyles(mockColors)).toBeDefined();
    expect(scanToastStyles(mockColors)).toBeDefined();
    expect(scannerControlsStyles(mockColors)).toBeDefined();
    expect(viewfinderStyles(mockColors)).toBeDefined();
    expect(inStoreCheckoutStyles(mockColors)).toBeDefined();
    expect(scannerScreenStyles(mockColors)).toBeDefined();
    expect(tabNavigatorStyles(mockColors)).toBeDefined();
  });
});
