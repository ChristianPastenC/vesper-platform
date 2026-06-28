import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderItemsSummary } from './OrderItemsSummary';

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

describe('OrderItemsSummary', () => {
  it('renders order items correctly', () => {
    const mockItems = [{ id: '1', name: 'Item 1', qty: 2, price: 50.0 }];

    const { getByTestId, getByText } = render(<OrderItemsSummary items={mockItems} total={100} />);

    expect(getByTestId('order-items-summary')).toBeTruthy();
    expect(getByText('orders.itemsSummaryTitle')).toBeTruthy();
    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Qty: 2')).toBeTruthy();
    expect(getByText('$50.00')).toBeTruthy();
    expect(getByText('$100.00')).toBeTruthy();
  });
});
