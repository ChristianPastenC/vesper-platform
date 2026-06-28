import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProfile } from './useProfile';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../../../core/auth/useAuthenticatedRequest', () => ({
  useAuthenticatedRequest: jest.fn(),
}));

describe('useProfile', () => {
  const mockLogout = jest.fn();
  const mockSetThemeMode = jest.fn();
  const mockSetLanguage = jest.fn();
  const mockExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        themeMode: 'light',
        setThemeMode: mockSetThemeMode,
        language: 'en',
        setLanguage: mockSetLanguage,
        logout: mockLogout,
      };
      return selector(state);
    });

    (useAuthenticatedRequest as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
  });

  it('fetches profile data when authenticated', async () => {
    mockExecute.mockResolvedValueOnce({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });

    const { result } = renderHook(() => useProfile());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profileData).toEqual({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });
    expect(result.current.userName).toBe('Test User');
    expect(mockExecute).toHaveBeenCalledWith('fetch-profile', {
      method: 'GET',
      path: '/api/v1/profile/me',
    });
  });

  it('handles fetch error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Fetch failed');
  });

  it('returns state from store', () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current.isAuthenticated).toBe(true);
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
      return selector({ isAuthenticated: true, themeMode: 'dark', setThemeMode: mockSetThemeMode });
    });
    const { result } = renderHook(() => useProfile());
    act(() => {
      result.current.toggleThemeMode();
    });
    expect(mockSetThemeMode).toHaveBeenCalledWith('system');
  });

  it('toggles theme mode from system to light', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        isAuthenticated: true,
        themeMode: 'system',
        setThemeMode: mockSetThemeMode,
      });
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
