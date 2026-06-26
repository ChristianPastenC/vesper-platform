import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CartFooter } from './CartFooter';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#121212',
      border: '#E0E0E0',
      primary: '#6200EE',
      error: '#B00020',
    },
    isDarkMode: false,
  }),
}));

describe('CartFooter', () => {
  it('renders correctly and handles interactions', () => {
    const onCheckout = jest.fn();
    const onClear = jest.fn();
    
    const { getByText, getByTestId } = render(
      <CartFooter
        address="123 Street"
        total={99.99}
        onCheckout={onCheckout}
        onClear={onClear}
        checkoutText="Checkout"
        clearText="Clear Cart"
        totalLabel="Total"
        addressLabel="Delivery Address"
      />
    );

    expect(getByText('123 Street')).toBeTruthy();
    expect(getByText('Delivery Address')).toBeTruthy();
    expect(getByText('Total:')).toBeTruthy();
    expect(getByText('$99.99')).toBeTruthy();

    fireEvent.press(getByTestId('checkout-btn'));
    expect(onCheckout).toHaveBeenCalled();

    fireEvent.press(getByTestId('clear-btn'));
    expect(onClear).toHaveBeenCalled();
  });
});
