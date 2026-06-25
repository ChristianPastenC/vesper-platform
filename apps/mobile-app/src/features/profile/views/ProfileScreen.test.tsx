import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';

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
      t: (key: string) => key,
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
      t: (key: string) => key,
    });

    const { getByText, getByTestId, queryByTestId } = render(<ProfileScreen />);

    expect(getByText('auth.title, John Doe!')).toBeTruthy();
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
      t: (key: string) => key,
    });

    const { getByTestId, getByText } = render(<ProfileScreen />);

    // Verify version and values
    expect(getByText('1.0.0')).toBeTruthy();
    expect(getByText('Español')).toBeTruthy();
    expect(getByText('shared_ui.themeSystem')).toBeTruthy();

    // Trigger toggles
    fireEvent.press(getByTestId('profile-theme-row'));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('profile-lang-row'));
    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it('uses fallback strings when translations are missing', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      userName: 'Alice',
      themeMode: 'light',
      toggleThemeMode: jest.fn(),
      language: 'en',
      toggleLanguage: jest.fn(),
      handleLogout: jest.fn(),
      t: () => undefined, // Return undefined for missing translation
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Welcome, Alice!')).toBeTruthy();
    expect(getByText('Light')).toBeTruthy();
    expect(getByText('Preferences')).toBeTruthy();
  });
});
