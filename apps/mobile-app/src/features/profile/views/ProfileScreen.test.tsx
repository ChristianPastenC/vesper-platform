import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('ProfileScreen View', () => {
  const mockSetEmail = jest.fn();
  const mockSetPassword = jest.fn();
  const mockSetConfirmPassword = jest.fn();
  const mockToggleMode = jest.fn();
  const mockSubmit = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders form inputs correctly in login mode', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      userName: null,
      mode: 'login',
      name: '',
      setName: jest.fn(),
      email: '',
      setEmail: mockSetEmail,
      password: '',
      setPassword: mockSetPassword,
      confirmPassword: '',
      setConfirmPassword: mockSetConfirmPassword,
      error: null,
      isPending: false,
      toggleMode: mockToggleMode,
      handleAuthSubmit: mockSubmit,
      handleLogout: mockLogout,
      t: (key: string) => key,
    });

    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    expect(getByTestId('profile-name-input')).toBeTruthy();
    expect(getByTestId('profile-email-input')).toBeTruthy();
    expect(getByTestId('profile-password-input')).toBeTruthy();
    expect(queryByTestId('profile-confirm-password-input')).toBeNull();
  });

  it('renders confirm password input in signup mode', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      userName: null,
      mode: 'signup',
      name: '',
      setName: jest.fn(),
      email: '',
      setEmail: mockSetEmail,
      password: '',
      setPassword: mockSetPassword,
      confirmPassword: '',
      setConfirmPassword: mockSetConfirmPassword,
      error: null,
      isPending: false,
      toggleMode: mockToggleMode,
      handleAuthSubmit: mockSubmit,
      handleLogout: mockLogout,
      t: (key: string) => key,
    });

    const { getByTestId } = render(<ProfileScreen />);

    expect(getByTestId('profile-name-input')).toBeTruthy();
    expect(getByTestId('profile-email-input')).toBeTruthy();
    expect(getByTestId('profile-password-input')).toBeTruthy();
    expect(getByTestId('profile-confirm-password-input')).toBeTruthy();
  });

  it('renders session card when authenticated and triggers logout', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      userName: 'John Doe',
      mode: 'login',
      name: '',
      setName: jest.fn(),
      email: '',
      setEmail: mockSetEmail,
      password: '',
      setPassword: mockSetPassword,
      confirmPassword: '',
      setConfirmPassword: mockSetConfirmPassword,
      error: null,
      isPending: false,
      toggleMode: mockToggleMode,
      handleAuthSubmit: mockSubmit,
      handleLogout: mockLogout,
      t: (key: string) => key,
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Session Active')).toBeTruthy();
    expect(getByText('Welcome, John Doe! You are successfully authenticated. Enjoy retail experiences.')).toBeTruthy();
    fireEvent.press(getByText('Sign Out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
