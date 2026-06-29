import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoreCard } from './StoreCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
      surface: '#F5F5F5',
      primary: '#6200EE',
      border: '#E0E0E0',
    },
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('StoreCard', () => {
  it('renders correctly with store info', () => {
    const mockOnPress = jest.fn();

    const { getByText, getByTestId } = render(
      <StoreCard
        id="1"
        name="Sovereign Downtown"
        distance="1.2 km"
        hours="09:00 - 21:00"
        address="123 Main St"
        onPressRoute={mockOnPress}
      />,
    );

    expect(getByText('Sovereign Downtown')).toBeTruthy();
    expect(getByText('1.2 km')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
    expect(getByText('09:00 - 21:00')).toBeTruthy();
    expect(getByText('Get Directions')).toBeTruthy();

    fireEvent.press(getByTestId('store-route-btn'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders with image', () => {
    const { getByTestId } = render(
      <StoreCard
        id="2"
        name="Store with Image"
        distance="2.0 km"
        hours="10:00 - 20:00"
        address="456 Elm St"
        image="https://example.com/image.jpg"
      />,
    );
    expect(getByTestId('store-card')).toBeTruthy();
  });
});
