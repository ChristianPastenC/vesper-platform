import React from 'react';
import { render } from '@testing-library/react-native';
import { DeliveryAddressCard } from './DeliveryAddressCard';

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

describe('DeliveryAddressCard', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <DeliveryAddressCard label="Delivery Address" address="123 Test Ave" />
    );

    expect(getByText('Delivery Address')).toBeTruthy();
    expect(getByText('123 Test Ave')).toBeTruthy();
  });
});
