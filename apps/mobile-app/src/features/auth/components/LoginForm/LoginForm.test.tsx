import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';
import { useSovereignLogin } from '../../hooks/useSovereignLogin';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../hooks/useSovereignLogin', () => ({
  useSovereignLogin: jest.fn(),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
      surface: '#F5F5F5',
      border: '#E0E0E0',
      error: '#B00020',
    },
  }),
}));

describe('LoginForm', () => {
  it('renders inputs and button correctly', () => {
    (useSovereignLogin as jest.Mock).mockReturnValue({
      name: '',
      setName: jest.fn(),
      email: '',
      setEmail: jest.fn(),
      password: '',
      setPassword: jest.fn(),
      error: null,
      isPending: false,
      handleLogin: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(<LoginForm />);
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-submit-button')).toBeTruthy();
    expect(queryByTestId('login-error-banner')).toBeNull();
  });

  it('renders error banner when error is present', () => {
    (useSovereignLogin as jest.Mock).mockReturnValue({
      name: '',
      setName: jest.fn(),
      email: '',
      setEmail: jest.fn(),
      password: '',
      setPassword: jest.fn(),
      error: 'Invalid credentials',
      isPending: false,
      handleLogin: jest.fn(),
    });

    const { getByTestId, getByText } = render(<LoginForm />);
    expect(getByTestId('login-error-banner')).toBeTruthy();
    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('calls handleLogin on button press', () => {
    const mockHandleLogin = jest.fn();
    (useSovereignLogin as jest.Mock).mockReturnValue({
      name: '',
      setName: jest.fn(),
      email: '',
      setEmail: jest.fn(),
      password: '',
      setPassword: jest.fn(),
      error: null,
      isPending: false,
      handleLogin: mockHandleLogin,
    });

    const { getByTestId } = render(<LoginForm />);
    fireEvent.press(getByTestId('login-submit-button'));
    expect(mockHandleLogin).toHaveBeenCalled();
  });
});
