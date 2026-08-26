import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';
import { useHome } from '../hooks/useHome';
import { useTheme } from '../../../core/theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { useNavigation } from '@react-navigation/native';
import { useSovereignCatalog } from '../../catalog/hooks/useSovereignCatalog';

jest.mock('../hooks/useHome', () => ({
  useHome: jest.fn(),
}));

jest.mock('../../catalog/hooks/useSovereignCatalog', () => ({
  useSovereignCatalog: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    navigate: jest.fn(),
  })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 20,
    left: 0,
    right: 0,
  }),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('HomeScreen Component', () => {
  const mockNavigateCatalog = jest.fn();
  const mockToggleNetwork = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue([]);
    (useSovereignCatalog as jest.Mock).mockReturnValue({
      products: [{ id: '1', name: 'Mock Real Product', price: 100, barcode: '123' }],
      loading: false,
      error: null,
      isEmpty: false,
      refetch: jest.fn(),
    });
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

    const { getByText } = render(<HomeScreen />);
    // Since `t` returns the key, we assert on the translation keys combined with the variables
    expect(getByText('home.promoTitle')).toBeTruthy();
    expect(getByText('home.shopOnlineCategory')).toBeTruthy();
    expect(getByText('home.scanAndGo')).toBeTruthy();
    expect(getByText('home.ourStores')).toBeTruthy();
    expect(getByText('home.myOrders')).toBeTruthy();

    // Check trending products list
    expect(getByText('home.trendingTitle')).toBeTruthy();
    expect(getByText('Mock Real Product')).toBeTruthy();
  });

  it('renders guest mode and offline state correctly', () => {
    (useHome as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      userName: null,
      isAuthenticated: false,
      isOnline: false,
      toggleNetwork: mockToggleNetwork,
      navigateToCatalog: jest.fn(),
      navigateToScanner: jest.fn(),
      navigateToAccount: jest.fn(),
    });

    const { getByText, getByTestId } = render(<HomeScreen />);

    expect(getByText('home.welcomeTitleGuest')).toBeTruthy();
    expect(getByText('home.loginPrompt')).toBeTruthy();
    // In offline mode (isFrozen), the pending sync alert should appear
    expect(getByText('home.pendingSync')).toBeTruthy();

    fireEvent.press(getByTestId('home-network-toggle'));
    expect(mockToggleNetwork).toHaveBeenCalledTimes(1);
  });

  it('renders header cart badge when items exist', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        onlineCart: [{ quantity: 2 }],
        addToOnlineCart: jest.fn(),
      };
      return selector(state);
    });
    const mockSetOptions = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: mockSetOptions,
      navigate: jest.fn(),
    });

    (useHome as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      userName: 'Alice',
      isAuthenticated: true,
      isOnline: true,
      toggleNetwork: jest.fn(),
      navigateToCatalog: jest.fn(),
      navigateToScanner: jest.fn(),
      navigateToAccount: jest.fn(),
    });

    render(<HomeScreen />);

    expect(mockSetOptions).toHaveBeenCalled();
    const optionsObj = mockSetOptions.mock.calls[0][0];

    // Evaluate headerRight function
    const HeaderRight = optionsObj.headerRight;
    const { getByTestId, getByText } = render(<HeaderRight />);
    expect(getByTestId('header-cart-badge')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });
});
