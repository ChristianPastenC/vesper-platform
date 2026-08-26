import { renderHook, act } from '@testing-library/react-native';
import { useHome } from './useHome';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useHome', () => {
  const mockNavigate = jest.fn();
  const mockToggleNetwork = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        userName: 'Test User',
        isAuthenticated: true,
        isOnline: true,
        toggleNetwork: mockToggleNetwork,
      };
      return selector(state);
    });
  });

  it('returns state from store', () => {
    const { result } = renderHook(() => useHome());

    expect(result.current.userName).toBe('Test User');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isOnline).toBe(true);
  });

  it('navigates to catalog', () => {
    const { result } = renderHook(() => useHome());
    act(() => {
      result.current.navigateToCatalog();
    });
    expect(mockNavigate).toHaveBeenCalledWith('CatalogTab');
  });

  it('navigates to online cart', () => {
    const { result } = renderHook(() => useHome());
    act(() => {
      result.current.navigateToOnlineCart();
    });
    expect(mockNavigate).toHaveBeenCalledWith('OnlineCart');
  });

  it('navigates to scanner', () => {
    const { result } = renderHook(() => useHome());
    act(() => {
      result.current.navigateToScanner();
    });
    expect(mockNavigate).toHaveBeenCalledWith('ScanAndGoTab');
  });

  it('navigates to account', () => {
    const { result } = renderHook(() => useHome());
    act(() => {
      result.current.navigateToAccount();
    });
    expect(mockNavigate).toHaveBeenCalledWith('ProfileTab');
  });
});
