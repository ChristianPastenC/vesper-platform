import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrdersScreen } from './OrdersScreen';


const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      primary: '#6200EE',
      text: '#121212',
    },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../hooks/useOrders', () => ({
  useOrders: () => ({
    activeOrders: [
      { id: 'ORD-1', status: 'processing', date: '2023-01-01', total: 100, items: [] },
    ],
    pastOrders: [{ id: 'ORD-2', status: 'delivered', date: '2023-01-02', total: 50, items: [] }],
  }),
}));

describe('OrdersScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders active orders by default', () => {
    const { getByTestId } = render(<OrdersScreen />);
    expect(getByTestId('order-item-ORD-1')).toBeTruthy();
  });

  it('switches to past orders when tab is clicked', () => {
    const { getByTestId, queryByTestId } = render(<OrdersScreen />);

    fireEvent.press(getByTestId('tab-past'));
    expect(getByTestId('order-item-ORD-2')).toBeTruthy();
    expect(queryByTestId('order-item-ORD-1')).toBeNull();
  });

  it('navigates to OrderDetails when an order is pressed', () => {
    const { getByTestId } = render(<OrdersScreen />);

    fireEvent.press(getByTestId('order-item-ORD-1'));
    expect(mockNavigate).toHaveBeenCalledWith('OrderDetails', { orderId: 'ORD-1' });
  });
});
