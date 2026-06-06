import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InStoreCheckoutScreen } from './InStoreCheckoutScreen';
import { useInStoreCheckout } from '../hooks/useInStoreCheckout';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';

jest.mock('../hooks/useInStoreCheckout', () => ({
  useInStoreCheckout: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('InStoreCheckoutScreen - Physical Retail Flow', () => {
  const mockGoBack = jest.fn();
  const mockNavigate = jest.fn();
  const mockToggleNetwork = jest.fn();
  const mockHandleCheckout = jest.fn();

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
        error: '#B00020',
      },
      isDarkMode: false,
    });
  });

  it('renders cart elements, switch state, and triggers payment successfully when online', () => {
    (useInStoreCheckout as jest.Mock).mockReturnValue({
      cartItems: [
        {
          id: 'scan-1',
          barcode: '75010001',
          name: 'Bananas',
          price: 2.5,
          quantity: 2,
        },
      ],
      total: 5.0,
      isOnline: true,
      toggleNetwork: mockToggleNetwork,
      isProcessing: false,
      error: null,
      handleCheckout: mockHandleCheckout,
      isAuthenticated: true,
      t: (key: string) => key,
    });

    const { getByText, getAllByText, getByTestId } = render(<InStoreCheckoutScreen />);

    expect(getByText('Bananas')).toBeTruthy();
    expect(getAllByText('$5.00').length).toBeGreaterThanOrEqual(1);
    expect(getByText('scan_and_go.onlineLabel')).toBeTruthy();

    const toggleSwitch = getByTestId('network-switch');
    fireEvent(toggleSwitch, 'onValueChange', false);
    expect(mockToggleNetwork).toHaveBeenCalled();

    fireEvent.press(getByText('scan_and_go.payButton'));
    expect(mockHandleCheckout).toHaveBeenCalled();
  });

  it('displays the 503 error banner when offline checkout fails', () => {
    (useInStoreCheckout as jest.Mock).mockReturnValue({
      cartItems: [
        {
          id: 'scan-1',
          barcode: '75010001',
          name: 'Bananas',
          price: 2.5,
          quantity: 2,
        },
      ],
      total: 5.0,
      isOnline: false,
      toggleNetwork: mockToggleNetwork,
      isProcessing: false,
      error: new Error('503 Service Unavailable'),
      handleCheckout: mockHandleCheckout,
      isAuthenticated: true,
      t: (key: string) => key,
    });

    const { getByText, getByTestId } = render(<InStoreCheckoutScreen />);

    expect(getByText('scan_and_go.offlineLabel')).toBeTruthy();
    const errorBanner = getByTestId('error-banner');
    expect(errorBanner).toBeTruthy();
    expect(getByText('scan_and_go.error503')).toBeTruthy();
  });
});
