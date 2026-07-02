import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RegisterForm } from './RegisterForm';
import { useSovereignRegister } from '../../hooks/useSovereignRegister';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../hooks/useSovereignRegister', () => ({
  useSovereignRegister: jest.fn(),
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

describe('RegisterForm', () => {
  it('renders inputs and button correctly', () => {
    (useSovereignRegister as jest.Mock).mockReturnValue({
      username: '',
      setUsername: jest.fn(),
      email: '',
      setEmail: jest.fn(),
      firstName: '',
      setFirstName: jest.fn(),
      lastName: '',
      setLastName: jest.fn(),
      phone: '',
      setPhone: jest.fn(),
      password: '',
      setPassword: jest.fn(),
      error: null,
      isPending: false,
      handleRegister: jest.fn(),
      t: (key: string) => key,
    });

    const { getByTestId, queryByTestId } = render(<RegisterForm />);
    expect(getByTestId('username-input')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('firstname-input')).toBeTruthy();
    expect(getByTestId('lastname-input')).toBeTruthy();
    expect(getByTestId('phone-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('register-submit-button')).toBeTruthy();
    expect(queryByTestId('register-error-banner')).toBeNull();
  });

  it('renders error banner when error is present', () => {
    (useSovereignRegister as jest.Mock).mockReturnValue({
      username: '',
      setUsername: jest.fn(),
      email: '',
      setEmail: jest.fn(),
      firstName: '',
      setFirstName: jest.fn(),
      lastName: '',
      setLastName: jest.fn(),
      phone: '',
      setPhone: jest.fn(),
      password: '',
      setPassword: jest.fn(),
      error: 'Registration error',
      isPending: false,
      handleRegister: jest.fn(),
      t: (key: string) => key,
    });

    const { getByTestId, getByText } = render(<RegisterForm />);
    expect(getByTestId('register-error-banner')).toBeTruthy();
    expect(getByText('Registration error')).toBeTruthy();
  });

  it('calls handleRegister on button press', () => {
    const mockHandleRegister = jest.fn();
    (useSovereignRegister as jest.Mock).mockReturnValue({
      username: '',
      setUsername: jest.fn(),
      email: '',
      setEmail: jest.fn(),
      firstName: '',
      setFirstName: jest.fn(),
      lastName: '',
      setLastName: jest.fn(),
      phone: '',
      setPhone: jest.fn(),
      password: '',
      setPassword: jest.fn(),
      error: null,
      isPending: false,
      handleRegister: mockHandleRegister,
      t: (key: string) => key,
    });

    const { getByTestId } = render(<RegisterForm />);
    fireEvent.press(getByTestId('register-submit-button'));
    expect(mockHandleRegister).toHaveBeenCalled();
  });
});
