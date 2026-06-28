import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from './ProductCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      text: '#000',
      surface: '#fff',
      border: '#ccc',
    },
  }),
}));

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 99.99,
    barcode: '1234567890123',
    image: 'https://via.placeholder.com/150',
  };

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={jest.fn()}
        onAddToInStore={jest.fn()}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Test Product')).toBeTruthy();
    expect(getByText('$99.99')).toBeTruthy();
    expect(getByTestId('product-card-press')).toBeTruthy();
  });

  it('handles add to cart press', () => {
    const mockOnAddToOnline = jest.fn();
    const { getByTestId } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={mockOnAddToOnline}
        onAddToInStore={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    const addBtn = getByTestId('product-card-add-btn');
    fireEvent.press(addBtn);
    expect(mockOnAddToOnline).toHaveBeenCalledWith(mockProduct);
  });

  it('handles card press', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={jest.fn()}
        onAddToInStore={jest.fn()}
        onPress={mockOnPress}
      />,
    );

    const cardBtn = getByTestId('product-card-press');
    fireEvent.press(cardBtn);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
