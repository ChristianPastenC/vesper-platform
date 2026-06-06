import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';
import { useHome } from '../hooks/useHome';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../hooks/useHome', () => ({
  useHome: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('HomeScreen Component', () => {
  const mockNavigateCatalog = jest.fn();
  const mockToggleNetwork = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#121212',
        border: '#E0E0E0',
        primary: '#6200EE',
        success: '#4CAF50',
        error: '#B00020',
      },
      isDarkMode: false,
    });
  });

  it('renders welcome and dashboard elements correctly', () => {
    (useHome as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      userName: 'Alice',
      isAuthenticated: true,
      isOnline: true,
      toggleNetwork: mockToggleNetwork,
      navigateToCatalog: mockNavigateCatalog,
      navigateToOnlineCart: jest.fn(),
      navigateToScanner: jest.fn(),
      navigateToAccount: jest.fn(),
    });

    const { getByText, getByTestId } = render(<HomeScreen />);

    expect(getByText('Hello, Alice!')).toBeTruthy();
    expect(getByText('Catalog')).toBeTruthy();
    expect(getByText('Scan & Go')).toBeTruthy();

    fireEvent.press(getByTestId('action-catalog'));
    expect(mockNavigateCatalog).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('home-network-toggle'));
    expect(mockToggleNetwork).toHaveBeenCalledTimes(1);
  });
});
