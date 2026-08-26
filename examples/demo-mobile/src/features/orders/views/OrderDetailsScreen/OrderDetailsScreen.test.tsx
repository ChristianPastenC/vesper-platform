import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderDetailsScreen } from './OrderDetailsScreen';
import { useOrders } from '../../hooks/useOrders';
import { useRoute } from '@react-navigation/native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#000000',
    },
  }),
}));

jest.mock('../../hooks/useOrders', () => ({
  useOrders: jest.fn(),
  formatOrderDate: (date: number) => new Date(date * 1000).toLocaleDateString(),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
}));

jest.mock('../../components/OrderTimeline/OrderTimeline', () => ({
  OrderTimeline: () => <></>,
}));

jest.mock('../../components/OrderItemsSummary/OrderItemsSummary', () => ({
  OrderItemsSummary: () => <></>,
}));

describe('OrderDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for a found order (processing)', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: { orderId: 'ord-123' },
    });
    (useOrders as jest.Mock).mockReturnValue({
      getOrderById: () => ({
        id: 'ord-123',
        status: 'processing',
        createdAt: 1672531200,
        timeline: [],
        items: [],
        total: 100,
      }),
    });

    const { getByText } = render(<OrderDetailsScreen />);
    expect(getByText('orders.orderId123')).toBeTruthy();
    expect(getByText('orders.statusProcessing')).toBeTruthy();
  });

  it('renders correctly for a shipped order', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: { orderId: 'ord-123' },
    });
    (useOrders as jest.Mock).mockReturnValue({
      getOrderById: () => ({
        id: 'ord-123',
        status: 'shipped',
        createdAt: 1672531200,
        timeline: [],
        items: [],
        total: 100,
      }),
    });

    const { getByText } = render(<OrderDetailsScreen />);
    expect(getByText('orders.statusShipped')).toBeTruthy();
  });

  it('renders correctly for a delivered order', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: { orderId: 'ord-123' },
    });
    (useOrders as jest.Mock).mockReturnValue({
      getOrderById: () => ({
        id: 'ord-123',
        status: 'delivered',
        createdAt: 1672531200,
        timeline: [],
        items: [],
        total: 100,
      }),
    });

    const { getByText } = render(<OrderDetailsScreen />);
    expect(getByText('orders.statusDelivered')).toBeTruthy();
  });

  it('renders correctly for a cancelled order', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: { orderId: 'ord-123' },
    });
    (useOrders as jest.Mock).mockReturnValue({
      getOrderById: () => ({
        id: 'ord-123',
        status: 'cancelled',
        createdAt: 1672531200,
        timeline: [],
        items: [],
        total: 100,
      }),
    });

    const { getByText } = render(<OrderDetailsScreen />);
    expect(getByText('orders.statusCancelled')).toBeTruthy();
  });

  it('renders correctly for an unknown status order', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: { orderId: 'ord-123' },
    });
    (useOrders as jest.Mock).mockReturnValue({
      getOrderById: () => ({
        id: 'ord-123',
        status: 'unknown-status',
        createdAt: 1672531200,
        timeline: [],
        items: [],
        total: 100,
      }),
    });

    const { getByText } = render(<OrderDetailsScreen />);
    expect(getByText('unknown-status')).toBeTruthy();
  });

  it('renders error state when order not found', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: { orderId: 'ord-999' },
    });
    (useOrders as jest.Mock).mockReturnValue({
      getOrderById: () => undefined,
    });

    const { getByText } = render(<OrderDetailsScreen />);
    expect(getByText('Order not found.')).toBeTruthy();
  });
});
