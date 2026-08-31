import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from './useScanner';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../../../core/auth/useAuthenticatedRequest', () => ({
  useAuthenticatedRequest: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
}));

jest.mock('react-native-quick-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('mock-access-token')),
}));

jest.mock('@vesper-core/ghost-ledger', () => ({
  encodeHeaders: jest.fn((headers) => headers),
}));

describe('useScanner', () => {
  const mockAddToInStoreCart = jest.fn();
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        addToInStoreCart: mockAddToInStoreCart,
      };
      return selector(state);
    });
    (useAuthenticatedRequest as jest.Mock).mockReturnValue({ execute: mockExecuteRequest });
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes correctly', () => {
    const { result } = renderHook(() => useScanner());

    expect(result.current.lastScanned).toBeNull();
  });

  it('simulates scan and clears last scanned after timeout', async () => {
    mockExecuteRequest.mockResolvedValue([]); // Mock network failure/empty to trigger fallback

    const { result } = renderHook(() => useScanner());

    await act(async () => {
      result.current.simulateScan();
      await Promise.resolve(); // flush microtasks for resolveProduct
    });

    expect(mockAddToInStoreCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        barcode: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
      }),
    );

    expect(result.current.lastScanned).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.lastScanned).toBeNull();
  });

  it('resolves product from network if token exists and API returns data', async () => {
    mockExecuteRequest.mockResolvedValue([
      { id: 99, barcode: 'net123', title: 'Net Product', price: 9.99 },
    ]);
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.onBarcodeScanned({ data: 'net123' } as BarcodeScanningResult);
      await Promise.resolve();
    });

    expect(mockAddToInStoreCart).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Net Product' }),
    );
  });

  it('handles unknown product barcode', async () => {
    mockExecuteRequest.mockResolvedValue([]);
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.onBarcodeScanned({ data: 'invalid_barcode' } as BarcodeScanningResult);
      await Promise.resolve();
    });

    expect(result.current.lastScanned).toContain('Unknown Item');
  });

  it('returns early if scanning is not active', async () => {
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.onBarcodeScanned({ data: '75010001' } as BarcodeScanningResult);
    });
    await act(async () => {
      await result.current.onBarcodeScanned({ data: '75010002' } as BarcodeScanningResult);
    });

    expect(mockAddToInStoreCart).toHaveBeenCalledTimes(1);
  });

  it('handles network error gracefully', async () => {
    mockExecuteRequest.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.onBarcodeScanned({ data: '75010001' } as BarcodeScanningResult);
      await Promise.resolve();
    });

    expect(mockAddToInStoreCart).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Organic Bananas 1kg' }),
    );
  });

  it('resolves product without token', async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);
    mockExecuteRequest.mockResolvedValue([
      { id: 99, barcode: 'net123', title: 'Net Product', price: 9.99 },
    ]);
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.onBarcodeScanned({ data: 'net123' } as BarcodeScanningResult);
      await Promise.resolve();
    });

    expect(mockAddToInStoreCart).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Net Product' }),
    );
  });

  it('handles permission undefined or not granted', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([null, jest.fn()]);
    const { result } = renderHook(() => useScanner());
    expect(result.current.hasPermission).toBe(false);
  });
});
