import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from './useScanner';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useScanner', () => {
  const mockAddToInStoreCart = jest.fn();

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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes correctly', () => {
    const { result } = renderHook(() => useScanner());

    expect(result.current.lastScanned).toBeNull();
  });

  it('simulates scan and clears last scanned after timeout', () => {
    const { result } = renderHook(() => useScanner());

    act(() => {
      result.current.simulateScan();
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
