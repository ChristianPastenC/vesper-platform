import React from 'react';
import { render } from '@testing-library/react-native';
import { CatalogScreen } from './CatalogScreen';
import { useCatalog } from '../hooks/useCatalog';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../hooks/useCatalog', () => ({
  useCatalog: jest.fn(),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

describe('CatalogScreen View', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#121212',
        border: '#E0E0E0',
        primary: '#6200EE',
      },
      isDarkMode: false,
    });

    (useCatalog as jest.Mock).mockReturnValue({
      products: [
        { id: '1', name: 'Product 1', price: 10.0, barcode: '11111' },
        { id: '2', name: 'Product 2', price: 20.0, barcode: '22222' },
      ],
      handleAddToOnline: jest.fn(),
      handleAddToInStore: jest.fn(),
    });
  });

  it('renders products in flatlist', () => {
    const { getByText } = render(<CatalogScreen />);
    expect(getByText('Product 1')).toBeTruthy();
    expect(getByText('Product 2')).toBeTruthy();
  });
});
