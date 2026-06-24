import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import { useSovereignLogin } from '../hooks/useSovereignLogin';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../hooks/useSovereignLogin', () => ({
  useSovereignLogin: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('LoginScreen View', () => {
  const mockLogin = jest.fn();
  const mockSetName = jest.fn();
  const mockSetEmail = jest.fn();
  const mockSetPassword = jest.fn();

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

  it('renders form inputs correctly', () => {
    (useSovereignLogin as jest.Mock).mockReturnValue({
      name: '',
      setName: mockSetName,
      email: '',
      setEmail: mockSetEmail,
      password: '',
      setPassword: mockSetPassword,
      error: null,
      isPending: false,
      handleLogin: mockLogin,
      t: (key: string) => key,
    });

    const { getByTestId, getByText } = render(<LoginScreen />);

    expect(getByText('auth.title')).toBeTruthy();
    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
  });

  it('triggers login submission callback', () => {
    (useSovereignLogin as jest.Mock).mockReturnValue({
      name: 'John',
      setName: mockSetName,
      email: 'john@example.com',
      setEmail: mockSetEmail,
      password: 'password123',
      setPassword: mockSetPassword,
      error: null,
      isPending: false,
      handleLogin: mockLogin,
      t: (key: string) => key,
    });

    const { getByTestId } = render(<LoginScreen />);

    const submitBtn = getByTestId('login-submit-button');
    fireEvent.press(submitBtn);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('displays error banner if validation fail error is returned', () => {
    (useSovereignLogin as jest.Mock).mockReturnValue({
      name: '',
      setName: mockSetName,
      email: '',
      setEmail: mockSetEmail,
      password: '',
      setPassword: mockSetPassword,
      error: 'Please enter a valid username and password.',
      isPending: false,
      handleLogin: mockLogin,
      t: (key: string) => key,
    });

    const { getByText, getByTestId } = render(<LoginScreen />);
    expect(getByTestId('login-error-banner')).toBeTruthy();
    expect(getByText('Please enter a valid username and password.')).toBeTruthy();
  });
});
