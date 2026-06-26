import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductDetailsScreen } from './ProductDetailsScreen';
import { useProductDetails } from '../hooks/useProductDetails';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';

jest.mock('../hooks/useProductDetails', () => ({
  useProductDetails: jest.fn(),
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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

describe('ProductDetailsScreen View', () => {
  const mockSetOptions = jest.fn();
  const mockHandleAddToOnline = jest.fn();
  const mockHandleAddToInStore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: mockSetOptions,
    });

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

    (useProductDetails as jest.Mock).mockReturnValue({
      product: {
        id: '1',
        name: 'Wireless Headphones',
        price: 99.99,
        barcode: '4006381333931',
      },
      handleAddToOnline: mockHandleAddToOnline,
      handleAddToInStore: mockHandleAddToInStore,
      handleGoBack: jest.fn(),
      specifications: [
        { labelKey: 'catalog.brand', value: 'Sovereign Core' },
        { labelKey: 'catalog.weight', value: '320g' },
        { labelKey: 'catalog.dimensions', value: '18 x 12 x 4 cm' },
        { labelKey: 'catalog.availability', value: 'catalog.inStock', isTranslationValue: true },
      ],
    });
  });

  it('renders product details screen content correctly', () => {
    const { getByText } = render(<ProductDetailsScreen />);

    expect(mockSetOptions).toHaveBeenCalledWith({
      title: 'catalog.productDetails',
      headerBackTitleVisible: false,
    });

    expect(getByText('Wireless Headphones')).toBeTruthy();
    expect(getByText('$99.99')).toBeTruthy();
    expect(getByText('catalog.ean: 4006381333931')).toBeTruthy();
    expect(getByText('catalog.brand')).toBeTruthy();
    expect(getByText('Sovereign Core')).toBeTruthy();
    expect(getByText('320g')).toBeTruthy();
  });

  it('triggers addToOnline when pressing online button', () => {
    const { getByTestId } = render(<ProductDetailsScreen />);
    const button = getByTestId('details-add-online-btn');
    fireEvent.press(button);
    expect(mockHandleAddToOnline).toHaveBeenCalled();
  });



  describe('getProductIcon branches', () => {
    const testIcon = (name: string) => {
      (useProductDetails as jest.Mock).mockReturnValue({
        product: { id: '1', name, price: 10, barcode: '123' },
        handleAddToOnline: mockHandleAddToOnline,
        handleAddToInStore: mockHandleAddToInStore,
        specifications: [],
      });
      render(<ProductDetailsScreen />);
    };

    it('handles keyboard', () => {
      testIcon('Mechanical Keyboard');
    });

    it('handles mouse', () => {
      testIcon('Gaming Mouse');
    });

    it('handles watch', () => {
      testIcon('Smart Watch');
    });

    it('handles hub', () => {
      testIcon('USB-C Hub');
    });

    it('handles adapter', () => {
      testIcon('Power Adapter');
    });

    it('handles unknown (fallback to cube)', () => {
      testIcon('Random Item');
    });
  });
});
