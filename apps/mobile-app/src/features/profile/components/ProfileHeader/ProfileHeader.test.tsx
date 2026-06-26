import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileHeader } from './ProfileHeader';
import { useProfile } from '../../hooks/useProfile';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../../hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
      surface: '#F5F5F5',
      primary: '#6200EE',
    },
  }),
}));

describe('ProfileHeader', () => {
  it('renders correctly for guest', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      userName: null,
    });

    const { getByTestId, getByText } = render(<ProfileHeader />);
    expect(getByTestId('profile-header-card')).toBeTruthy();
    expect(getByText('Hello, Guest!')).toBeTruthy();
    expect(getByText('Sign in to unlock checkout features')).toBeTruthy();
  });

  it('renders correctly for authenticated user', () => {
    (useProfile as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      userName: 'John',
    });

    const { getByText } = render(<ProfileHeader />);
    expect(getByText('Welcome, John!')).toBeTruthy();
    expect(getByText('Session Active')).toBeTruthy();
    expect(getByText('J')).toBeTruthy();
  });
});
