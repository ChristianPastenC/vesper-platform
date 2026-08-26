import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AuthPromptCard } from './AuthPromptCard';
import { useProfile } from '../../hooks/useProfile';
import { useNavigation } from '@react-navigation/native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../../hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
      surface: '#F5F5F5',
      primary: '#6200EE',
      error: '#B00020',
    },
  }),
}));

describe('AuthPromptCard', () => {
  it('renders login row when guest', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      handleLogout: jest.fn(),
    });

    const mockNavigate = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    const { getByTestId, getByText } = render(<AuthPromptCard />);
    expect(getByText('Sign In / Register')).toBeTruthy();

    fireEvent.press(getByTestId('profile-login-row'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('renders logout row when authenticated', () => {
    const mockLogout = jest.fn();
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      handleLogout: mockLogout,
    });
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
    });

    const { getByTestId, getByText } = render(<AuthPromptCard />);
    expect(getByText('Sign Out')).toBeTruthy();

    fireEvent.press(getByTestId('profile-logout-row'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
