import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OnlineCheckoutModal } from './OnlineCheckoutModal';
import { useOnlineCart } from '../hooks/useOnlineCart';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';

jest.mock('../hooks/useOnlineCart', () => ({
  useOnlineCart: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('OnlineCheckoutModal View', () => {
  const mockGoBack = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
      navigate: mockNavigate,
    });
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#121212',
        border: '#E0E0E0',
        primary: '#6200EE',
      },
      isDarkMode: false,
    });
  });

  it('handles successful checkout integration', () => {
    const mockCheckout = jest.fn((cb) => cb('ON-123456'));
    (useOnlineCart as jest.Mock).mockReturnValue({
      total: 50.0,
      address: '123 Sovereign Way',
      isProcessing: false,
      handleCheckout: mockCheckout,
      t: (key: string) => key,
    });

    const { getByText } = render(<OnlineCheckoutModal />);
    expect(getByText('$50.00')).toBeTruthy();
    expect(getByText('123 Sovereign Way')).toBeTruthy();

    fireEvent.press(getByText('online_checkout.checkoutButton'));
    expect(mockCheckout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('PaymentSuccessScreen', {
      orderId: 'ON-123456',
      type: 'online',
    });
  });
});
