import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeroBanner } from './HeroBanner';
import { useTheme } from '../../../../core/theme/useTheme';

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('HeroBanner Component', () => {
  const mockNavigateToAccount = jest.fn();
  const mockT = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        surface: '#FFFFFF',
        text: '#121212',
        textSecondary: '#757575',
        primary: '#6200EE',
        border: '#E0E0E0',
      },
    });
  });

  it('renders auth state correctly as a promo banner', () => {
    const { getByTestId, getByText } = render(
      <HeroBanner
        isAuthenticated={true}
        userName="Alice"
        navigateToAccount={mockNavigateToAccount}
        t={mockT}
      />
    );

    expect(getByTestId('hero-auth-card')).toBeTruthy();
    expect(getByText('home.promoTitle')).toBeTruthy();
    expect(getByText('home.promoSubtitle')).toBeTruthy();
    expect(getByText('home.shopNow')).toBeTruthy();
  });

  it('renders unauth state correctly and handles login press', () => {
    const { getByTestId, getByText } = render(
      <HeroBanner
        isAuthenticated={false}
        userName={null}
        navigateToAccount={mockNavigateToAccount}
        t={mockT}
      />
    );

    expect(getByTestId('hero-unauth-card')).toBeTruthy();
    expect(getByText('home.welcomeTitleGuest')).toBeTruthy();
    expect(getByText('home.loginPrompt')).toBeTruthy();
    
    fireEvent.press(getByTestId('hero-login-btn'));
    expect(mockNavigateToAccount).toHaveBeenCalledTimes(1);
  });
});
