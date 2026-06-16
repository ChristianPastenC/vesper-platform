import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CatalogScreen } from './CatalogScreen';
import { useSovereignCatalog } from '../hooks/useSovereignCatalog';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('../hooks/useSovereignCatalog', () => ({
  useSovereignCatalog: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 20,
    left: 0,
    right: 0,
  }),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

describe('CatalogScreen View', () => {
  const mockSetOptions = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: mockSetOptions,
      navigate: mockNavigate,
    });

    (useAppStore as unknown as jest.Mock).mockReturnValue([]); // Return empty onlineCart array

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

    (useSovereignCatalog as jest.Mock).mockReturnValue({
      products: [
        { id: '1', name: 'Product 1', price: 10.0, barcode: '11111' },
        { id: '2', name: 'Product 2', price: 20.0, barcode: '22222' },
      ],
      loading: false,
      error: null,
      isEmpty: false,
      refetch: jest.fn(),
    });
  });

  it('renders products in flatlist', () => {
    const { getByText } = render(<CatalogScreen />);
    expect(getByText('Product 1')).toBeTruthy();
    expect(getByText('Product 2')).toBeTruthy();
  });

  it('navigates to ProductDetails when product card is tapped', () => {
    const { getAllByTestId } = render(<CatalogScreen />);
    const cardPressables = getAllByTestId('product-card-press');

    fireEvent.press(cardPressables[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetails', {
      product: { id: '1', name: 'Product 1', price: 10.0, barcode: '11111' },
    });
  });
});
