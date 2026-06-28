import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductListScreen } from './ProductListScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    setOptions: mockSetOptions,
    navigate: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      category: 'electronics',
    },
  }),
}));

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('../hooks/useCatalog', () => ({
  useCatalog: () => ({
    products: [{ id: '1', name: 'Phone', price: 999, barcode: '123' }],
    loading: false,
    error: null,
    isEmpty: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../components/ProductGrid/ProductGrid', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { View, Text } = require('react-native');
  return {
    ProductGrid: () => (
      <View testID="mock-product-grid">
        <Text>Mocked Grid</Text>
      </View>
    ),
  };
});

describe('ProductListScreen', () => {
  it('renders correctly and sets title', () => {
    const { getByTestId } = render(<ProductListScreen />);

    expect(getByTestId('product-list-screen')).toBeTruthy();
    expect(getByTestId('mock-product-grid')).toBeTruthy();

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerBackTitleVisible: false,
      }),
    );
  });

  it('renders correctly without category', () => {
    // Override useRoute mock for this test
    const { useRoute } = require('@react-navigation/native');
    useRoute.mockReturnValueOnce({ params: undefined });

    const { getByTestId } = render(<ProductListScreen />);
    expect(getByTestId('product-list-screen')).toBeTruthy();
  });
});
