import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductHero } from './ProductHero';

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      text: '#000',
      surface: '#fff',
      border: '#ccc',
    },
  }),
}));

describe('ProductHero', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = render(
      <ProductHero name="Test Product" price={99.99} barcode="123456789" />,
    );
    expect(getByTestId('product-hero-container')).toBeTruthy();
    expect(getByText('Test Product')).toBeTruthy();
    expect(getByText('$99.99')).toBeTruthy();
    expect(getByText('catalog.ean: 123456789')).toBeTruthy();
  });

  it('keeps rendering the image through its load lifecycle events', () => {
    const { getByTestId } = render(
      <ProductHero
        name="Wireless Headphones"
        price={49.99}
        barcode="123456789"
        image="https://example.com/photo.jpg"
      />,
    );

    const image = getByTestId('product-hero-image');
    fireEvent(image, 'onLoadStart');
    fireEvent(image, 'onLoadEnd');

    expect(getByTestId('product-hero-image')).toBeTruthy();
  });

  it('falls back to a product icon when the image fails to load', () => {
    const { getByTestId, queryByTestId } = render(
      <ProductHero
        name="Wireless Headphones"
        price={49.99}
        barcode="123456789"
        image="https://example.com/broken.jpg"
      />,
    );

    expect(getByTestId('product-hero-image')).toBeTruthy();

    fireEvent(getByTestId('product-hero-image'), 'onError');

    expect(queryByTestId('product-hero-image')).toBeNull();
  });
});
