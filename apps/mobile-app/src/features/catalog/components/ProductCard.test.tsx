import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard, Product } from './ProductCard';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

const mockProduct: Product = {
  id: 'p1',
  name: 'Premium Coffee Beans',
  price: 15.99,
  barcode: '750102030405',
};

describe('ProductCard Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        primary: '#6200EE',
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#121212',
        border: '#E0E0E0',
      },
      isDarkMode: false,
    });
  });

  it('renders product details correctly', () => {
    const { getByText } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={jest.fn()}
        onAddToInStore={jest.fn()}
      />
    );

    expect(getByText('Premium Coffee Beans')).toBeTruthy();
    expect(getByText('$15.99')).toBeTruthy();
    expect(getByText('Barcode: 750102030405')).toBeTruthy();
  });

  it('triggers onAddToOnline callback on shipping button press', () => {
    const mockOnline = jest.fn();
    const { getByText } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={mockOnline}
        onAddToInStore={jest.fn()}
      />
    );

    fireEvent.press(getByText('catalog.addToOnline'));
    expect(mockOnline).toHaveBeenCalledWith(mockProduct);
  });

  it('triggers onAddToInStore callback on instore button press', () => {
    const mockInStore = jest.fn();
    const { getByText } = render(
      <ProductCard
        product={mockProduct}
        onAddToOnline={jest.fn()}
        onAddToInStore={mockInStore}
      />
    );

    fireEvent.press(getByText('catalog.addToInStore'));
    expect(mockInStore).toHaveBeenCalledWith(mockProduct);
  });
});
