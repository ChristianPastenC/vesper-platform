import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaymentSuccessScreen } from './PaymentSuccessScreen';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation, useRoute } from '@react-navigation/native';

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

describe('PaymentSuccessScreen', () => {
  const mockPopToTop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      popToTop: mockPopToTop,
    });
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#121212',
        border: '#E0E0E0',
        primary: '#6200EE',
        success: '#4CAF50',
      },
      isDarkMode: false,
    });
  });

  it('renders online success correctly', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        orderId: 'ON-123456',
        type: 'online',
      },
    });

    const { getByText, queryByText } = render(<PaymentSuccessScreen />);
    expect(getByText('online_checkout.success')).toBeTruthy();
    expect(getByText('ON-123456')).toBeTruthy();
    expect(queryByText('Exit Gate QR Code')).toBeNull();
  });

  it('renders instore success with exit QR correctly', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        orderId: 'IS-987654',
        type: 'instore',
      },
    });

    const { getByText } = render(<PaymentSuccessScreen />);
    expect(getByText('scan_and_go.success')).toBeTruthy();
    expect(getByText('IS-987654')).toBeTruthy();
    expect(getByText('Exit Gate QR Code')).toBeTruthy();

    fireEvent.press(getByText('Return to Catalog'));
    expect(mockPopToTop).toHaveBeenCalledTimes(1);
  });
});
