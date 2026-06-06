import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OnlineCartScreen } from './OnlineCartScreen';
import { useOnlineCart } from '../hooks/useOnlineCart';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';

jest.mock('../hooks/useOnlineCart', () => ({
  useOnlineCart: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 20,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('OnlineCartScreen View', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
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

  it('renders empty cart message when no items', () => {
    (useOnlineCart as jest.Mock).mockReturnValue({
      cartItems: [],
      total: 0,
      address: '123 Sovereign Way',
      clearCart: jest.fn(),
      t: (key: string) => key,
    });

    const { getByText } = render(<OnlineCartScreen />);
    expect(getByText('online_checkout.empty')).toBeTruthy();
  });

  it('renders cart details and triggers checkout navigation', () => {
    const mockClear = jest.fn();
    (useOnlineCart as jest.Mock).mockReturnValue({
      cartItems: [{ id: '1', name: 'Item A', price: 10.0, quantity: 2 }],
      total: 20.0,
      address: '123 Sovereign Way',
      clearCart: mockClear,
      isAuthenticated: true,
      t: (key: string) => key,
    });

    const { getByText, getAllByText } = render(<OnlineCartScreen />);
    expect(getByText('Item A')).toBeTruthy();
    expect(getAllByText('$20.00').length).toBeGreaterThanOrEqual(1);
    expect(getByText('123 Sovereign Way')).toBeTruthy();

    fireEvent.press(getByText('online_checkout.checkoutButton'));
    expect(mockNavigate).toHaveBeenCalledWith('OnlineCheckoutModal');

    fireEvent.press(getByText('shared_ui.close'));
    expect(mockClear).toHaveBeenCalledTimes(1);
  });
});
