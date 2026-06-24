import { renderHook, act } from '@testing-library/react-native';
import { useProfile } from './useProfile';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useProfile', () => {
  const mockLogout = jest.fn();
  const mockSetThemeMode = jest.fn();
  const mockSetLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        userName: 'Test User',
        themeMode: 'light',
        setThemeMode: mockSetThemeMode,
        language: 'en',
        setLanguage: mockSetLanguage,
        logout: mockLogout,
      };
      return selector(state);
    });
  });

  it('returns state from store', () => {
    const { result } = renderHook(() => useProfile());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userName).toBe('Test User');
    expect(result.current.themeMode).toBe('light');
    expect(result.current.language).toBe('en');
  });

  it('toggles theme mode correctly', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.toggleThemeMode();
    });
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('toggles theme mode from dark to system', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ themeMode: 'dark', setThemeMode: mockSetThemeMode });
    });
    const { result } = renderHook(() => useProfile());
    act(() => {
      result.current.toggleThemeMode();
    });
    expect(mockSetThemeMode).toHaveBeenCalledWith('system');
  });

  it('toggles theme mode from system to light', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ themeMode: 'system', setThemeMode: mockSetThemeMode });
    });
    const { result } = renderHook(() => useProfile());
    act(() => {
      result.current.toggleThemeMode();
    });
    expect(mockSetThemeMode).toHaveBeenCalledWith('light');
  });

  it('toggles language', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.toggleLanguage();
    });
    expect(mockSetLanguage).toHaveBeenCalledWith('es');
  });

  it('calls logout', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.handleLogout();
    });
    expect(mockLogout).toHaveBeenCalled();
  });
});
