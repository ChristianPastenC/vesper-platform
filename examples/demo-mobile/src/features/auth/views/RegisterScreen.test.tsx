import React from 'react';
import { render } from '@testing-library/react-native';
import { RegisterScreen } from './RegisterScreen';
import { useSovereignRegister } from '../hooks/useSovereignRegister';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../hooks/useSovereignRegister', () => ({
  useSovereignRegister: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('RegisterScreen View', () => {
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

  it('renders form correctly', () => {
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

    const { getByTestId } = render(<RegisterScreen />);

    expect(getByTestId('register-form')).toBeTruthy();
  });
});
