import React from 'react';
import { render } from '@testing-library/react-native';
import { OrdersList } from './OrdersList';
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

describe('OrdersList', () => {
  it('renders list of orders correctly', () => {
    const mockOrders: Order[] = [
      {
        id: 'ORD-1',
        status: 'processing',
        date: '2023-10-15T14:30:00Z',
        total: 100,
        items: [],
        timeline: [],
      },
    ];

    const { getByTestId } = render(
      <OrdersList
        orders={mockOrders}
        emptyMessageKey="orders.emptyActive"
        onOrderPress={jest.fn()}
      />,
    );

    expect(getByTestId('orders-list')).toBeTruthy();
    expect(getByTestId('order-item-ORD-1')).toBeTruthy();
  });

  it('renders empty state correctly', () => {
    const { getByTestId, getByText } = render(
      <OrdersList orders={[]} emptyMessageKey="orders.emptyActive" onOrderPress={jest.fn()} />,
    );

    expect(getByTestId('empty-orders-state')).toBeTruthy();
    expect(getByText('orders.emptyActive')).toBeTruthy();
  });
});
