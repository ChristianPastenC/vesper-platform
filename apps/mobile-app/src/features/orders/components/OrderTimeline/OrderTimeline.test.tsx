import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderTimeline } from './OrderTimeline';

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

describe('OrderTimeline', () => {
  it('renders correctly with events', () => {
    const mockEvents = [
      {
        status: 'processing',
        timestamp: '2023-01-01T10:00:00Z',
        description: 'Order confirmed',
      },
    ];

    const { getByTestId, getByText } = render(<OrderTimeline events={mockEvents} />);

    expect(getByTestId('order-timeline')).toBeTruthy();
    expect(getByText('orders.timelineTitle')).toBeTruthy();
    expect(getByText('processing')).toBeTruthy();
    expect(getByText('Order confirmed')).toBeTruthy();
  });
});
