import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from './ProductCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../core/theme/useTheme', () => ({
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

  it('falls back to a placeholder icon when the image fails to load', () => {
    const { getByTestId, queryByTestId, getAllByText } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={jest.fn()}
        onAddToInStore={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    fireEvent(getByTestId('product-card-image'), 'onError');

    expect(queryByTestId('product-card-image')).toBeNull();
    expect(getByTestId('product-card-image-fallback')).toBeTruthy();
    expect(getAllByText('Test Product').length).toBeGreaterThan(0);
  });

  it('keeps rendering the image through its load lifecycle events', () => {
    const { getByTestId, queryByTestId } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={jest.fn()}
        onAddToInStore={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    const image = getByTestId('product-card-image');
    fireEvent(image, 'onLoadStart');
    fireEvent(image, 'onLoadEnd');

    expect(getByTestId('product-card-image')).toBeTruthy();
    expect(queryByTestId('product-card-image-fallback')).toBeNull();
  });

  it('renders the placeholder icon when the product has no image', () => {
    const { getByTestId } = render(
      <ProductCard
        product={{ ...mockProduct, image: undefined }}
        onAddToOnline={jest.fn()}
        onAddToInStore={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(getByTestId('product-card-image-fallback')).toBeTruthy();
  });
});
