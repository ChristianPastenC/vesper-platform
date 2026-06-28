import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderDetailsScreen } from './OrderDetailsScreen';

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: { orderId: 'ORD-1' },
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      primary: '#6200EE',
      text: '#121212',
      border: '#E0E0E0',
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
    getOrderById: (id: string) => {
      if (id === 'ORD-1') {
        return {
          id: 'ORD-1',
          status: 'processing',
          date: '2023-01-01T10:00:00Z',
          total: 100,
          items: [],
          timeline: [],
        };
      }
      return undefined;
    },
  }),
}));

describe('OrderDetailsScreen', () => {
  it('renders order details correctly', () => {
    const { getByText } = render(<OrderDetailsScreen />);

    expect(getByText('orders.orderId1')).toBeTruthy();
    expect(getByText('orders.statusProcessing')).toBeTruthy();
  });
});
