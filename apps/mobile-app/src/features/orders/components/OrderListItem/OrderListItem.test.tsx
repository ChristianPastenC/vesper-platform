import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderListItem } from './OrderListItem';
import { Order } from '../../hooks/orders.mock';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#6200EE',
      surface: '#FFFFFF',
      text: '#121212',
      border: '#E0E0E0',
    },
  }),
}));

const mockOrder: Order = {
  id: 'ORD-1234-XYZ',
  status: 'processing',
  date: '2023-10-15T14:30:00Z',
  total: 450.0,
  items: [{ id: '1', name: 'Item 1', qty: 1, price: 350.0 }],
  timeline: [],
};

describe('OrderListItem', () => {
  it('renders order details correctly', () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(
      <OrderListItem order={mockOrder} onPress={onPress} />,
    );

    expect(getByTestId('order-item-ORD-1234-XYZ')).toBeTruthy();
    expect(getByText('orders.orderId1234')).toBeTruthy();
    expect(getByText('orders.statusProcessing')).toBeTruthy();
    expect(getByText('$450.00')).toBeTruthy();

    fireEvent.press(getByTestId('order-item-ORD-1234-XYZ'));
    expect(onPress).toHaveBeenCalledWith('ORD-1234-XYZ');
  });
});
