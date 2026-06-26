import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductGrid } from './ProductGrid';

jest.mock('./useProductGrid', () => ({
  useProductGrid: () => ({
    handleAddToOnline: jest.fn(),
    handleAddToInStore: jest.fn(),
    handleProductPress: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      text: '#000',
      surface: '#fff',
      border: '#ccc',
      error: '#f00',
    },
  }),
}));

describe('ProductGrid', () => {
  const mockProducts = [
    { id: '1', name: 'Product 1', price: 10, barcode: '123', image: '' },
    { id: '2', name: 'Product 2', price: 20, barcode: '456', image: '' },
  ];

  it('renders products correctly', () => {
    const { getByText } = render(
      <ProductGrid
        products={mockProducts}
        loading={false}
        error={null}
        isEmpty={false}
        refetch={jest.fn()}
      />
    );
    expect(getByText('Product 1')).toBeTruthy();
    expect(getByText('Product 2')).toBeTruthy();
  });

  it('renders empty state', () => {
    const { getByTestId } = render(
      <ProductGrid
        products={[]}
        loading={false}
        error={null}
        isEmpty={true}
        refetch={jest.fn()}
      />
    );
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('renders error state', () => {
    const { getByTestId } = render(
      <ProductGrid
        products={[]}
        loading={false}
        error={new Error('Error')}
        isEmpty={false}
        refetch={jest.fn()}
      />
    );
    expect(getByTestId('error-state')).toBeTruthy();
  });
});
