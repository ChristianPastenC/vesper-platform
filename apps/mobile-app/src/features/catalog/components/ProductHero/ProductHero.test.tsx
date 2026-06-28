import React from 'react';
import { render } from '@testing-library/react-native';
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
});
