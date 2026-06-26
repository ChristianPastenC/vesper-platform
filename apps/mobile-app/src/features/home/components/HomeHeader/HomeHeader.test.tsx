import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeHeader } from './HomeHeader';
import { useTheme } from '../../../../core/theme/useTheme';

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('HomeHeader Component', () => {
  const mockNavigateToScanner = jest.fn();
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
      },
    });
  });

  it('renders correctly and responds to interactions', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <HomeHeader
        navigateToScanner={mockNavigateToScanner}
        navigateToAccount={mockNavigateToAccount}
        t={mockT}
      />
    );

    expect(getByPlaceholderText('home.searchPlaceholder')).toBeTruthy();

    fireEvent.press(getByTestId('header-scanner-btn'));
    expect(mockNavigateToScanner).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('header-account-btn'));
    expect(mockNavigateToAccount).toHaveBeenCalledTimes(1);
  });
});
