import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { randomUUID } from 'react-native-quick-crypto';
import { encodeHeaders } from '@vesper/ghost-ledger';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { BackendProduct } from '../../../features/catalog/hooks/useSovereignCatalog';
import { getApiUrl } from '../../../core/config';

export interface ScannableProduct {
  id: string;
  barcode: string;
  name: string;
  price: number;
}

const SCANNABLE_PRODUCTS: ScannableProduct[] = [
  { id: 'scan-1', barcode: '75010001', name: 'Organic Bananas 1kg', price: 2.49 },
  { id: 'scan-2', barcode: '75010002', name: 'Fresh Milk 1L', price: 1.89 },
  { id: 'scan-3', barcode: '75010003', name: 'Whole Wheat Bread', price: 3.29 },
  { id: 'scan-4', barcode: '75010004', name: 'Avocados Bag', price: 4.99 },
  { id: 'scan-5', barcode: '75010005', name: 'Greek Yogurt 500g', price: 2.99 },
];

export const useScanner = () => {
  const { t } = useTranslation();
  const addToInStoreCart = useAppStore((state) => state.addToInStoreCart);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const { execute } = useAuthenticatedRequest();
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);

  const resolveProduct = useCallback(
    async (barcode: string): Promise<ScannableProduct | null> => {
      try {
        const API_URL = getApiUrl();
        const token = await getAccessToken();
        const encodedHeaders = encodeHeaders({
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        });

        const response = await execute<BackendProduct[]>(randomUUID(), {
          method: 'GET',
          url: `${API_URL}/api/v1/catalog?barcode=${encodeURIComponent(barcode)}`,
          headers: encodedHeaders,
        });

        if (response && response.length > 0) {
          const product = response[0];
          return {
            id: String(product.id),
            barcode: product.barcode,
            name: product.title,
            price: product.price,
          };
        }
      } catch (e) {
        console.warn('Network resolve failed, falling back to local catalog', e);
      }

      // Fallback local search
      return SCANNABLE_PRODUCTS.find((p) => p.barcode === barcode) || null;
    },
    [execute],
  );

  const onBarcodeScanned = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      if (!isScanningActive) return;

      // Throttle duplicate scans temporarily
      setIsScanningActive(false);

      const barcode = scanningResult.data;
      const product = await resolveProduct(barcode);

      if (product) {
        addToInStoreCart({
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
        });

        setLastScanned(`${product.name} (${product.barcode})`);
      } else {
        setLastScanned(`Unknown Item (${barcode})`);
      }

      setTimeout(() => {
        setLastScanned(null);
        setIsScanningActive(true);
      }, 2000);
    },
    [isScanningActive, addToInStoreCart, resolveProduct],
  );

  const simulateScan = () => {
    const randomIndex = Math.floor(Math.random() * SCANNABLE_PRODUCTS.length);
    const mockResult = { data: SCANNABLE_PRODUCTS[randomIndex].barcode } as BarcodeScanningResult;
    onBarcodeScanned(mockResult);
  };

  return {
    lastScanned,
    simulateScan,
    onBarcodeScanned,
    hasPermission: permission?.granted ?? false,
    requestPermission,
    t,
  };
};
