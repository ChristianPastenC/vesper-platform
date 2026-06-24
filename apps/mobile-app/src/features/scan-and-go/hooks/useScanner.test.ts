import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from './useScanner';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { useCameraPermissions } from 'expo-camera';
import { randomUUID } from 'expo-crypto';

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

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('mock-access-token')),
}));

jest.mock('@sovereign/secure-client', () => ({
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
      })
    );

    expect(result.current.lastScanned).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.lastScanned).toBeNull();
  });
});
