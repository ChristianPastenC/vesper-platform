import React from 'react';
import { render } from '@testing-library/react-native';
import { OnlineCartList } from './OnlineCartList';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

const mockItems = [
  { id: '1', name: 'Item 1', price: 10, quantity: 1, ean: '111', stock: 5 },
  { id: '2', name: 'Item 2', price: 20, quantity: 2, ean: '222', stock: 10 },
];

describe('OnlineCartList', () => {
  it('renders empty state when cart is empty', () => {
    const { getByTestId, getByText } = render(
      <OnlineCartList cartItems={[]} emptyMessage="Empty Cart" />
    );
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByText('Empty Cart')).toBeTruthy();
  });

  it('renders list of items when cart has items', () => {
    const { getByTestId, getByText } = render(
      <OnlineCartList cartItems={mockItems} emptyMessage="Empty Cart" />
    );
    expect(getByTestId('cart-list')).toBeTruthy();
    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
  });
});
