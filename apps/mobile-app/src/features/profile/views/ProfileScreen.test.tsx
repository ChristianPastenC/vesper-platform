import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 20,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('ProfileScreen View Settings Redesign', () => {
  const mockToggleTheme = jest.fn();
  const mockToggleLanguage = jest.fn();
  const mockLogout = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue('123 Sovereign Way');
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#121212',
        border: '#E0E0E0',
        primary: '#6200EE',
        error: '#B00020',
      },
      isDarkMode: false,
    });
  });

  it('renders correctly in guest mode', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      userName: null,
      themeMode: 'light',
      toggleThemeMode: mockToggleTheme,
      language: 'en',
      toggleLanguage: mockToggleLanguage,
      handleLogout: mockLogout,
    });

    const { getByText, getByTestId, queryByTestId } = render(<ProfileScreen />);

    expect(getByText('Hello, Guest!')).toBeTruthy();
    expect(getByText('Sign in to unlock checkout features')).toBeTruthy();
    expect(getByTestId('profile-login-row')).toBeTruthy();
    expect(queryByTestId('profile-logout-row')).toBeNull();

    fireEvent.press(getByTestId('profile-login-row'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('renders correctly in authenticated session and logs out', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      userName: 'John Doe',
      themeMode: 'dark',
      toggleThemeMode: mockToggleTheme,
      language: 'en',
      toggleLanguage: mockToggleLanguage,
      handleLogout: mockLogout,
    });

    const { getByText, getByTestId, queryByTestId } = render(<ProfileScreen />);

    expect(getByText('Welcome, John Doe!')).toBeTruthy();
    expect(getByText('Session Active')).toBeTruthy();
    expect(getByTestId('profile-logout-row')).toBeTruthy();
    expect(queryByTestId('profile-login-row')).toBeNull();

    fireEvent.press(getByTestId('profile-logout-row'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('handles preference settings changes', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      userName: null,
      themeMode: 'system',
      toggleThemeMode: mockToggleTheme,
      language: 'es',
      toggleLanguage: mockToggleLanguage,
      handleLogout: mockLogout,
    });

    const { getByTestId, getByText } = render(<ProfileScreen />);

    expect(getByText('1.0.0')).toBeTruthy();
    expect(getByText('Español')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();

    fireEvent.press(getByTestId('profile-theme-row'));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('profile-lang-row'));
    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });
});
