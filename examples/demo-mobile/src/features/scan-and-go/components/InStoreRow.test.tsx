import React from 'react';
import { render } from '@testing-library/react-native';
import { InStoreRow } from './InStoreRow';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('InStoreRow Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        primary: '#6200EE',
        background: '#FFFFFF',
        text: '#121212',
        border: '#E0E0E0',
      },
      isDarkMode: false,
    });
  });

  it('renders item name, barcode, price calculations and total correctly', () => {
    const item = {
      id: '1',
      barcode: '12345678',
      name: 'Item A',
      price: 5.0,
      quantity: 4,
    };
    const { getByText } = render(<InStoreRow item={item} />);

    expect(getByText('Item A')).toBeTruthy();
    expect(getByText('UPC: 12345678')).toBeTruthy();
    expect(getByText('$5.00 x 4')).toBeTruthy();
    expect(getByText('$20.00')).toBeTruthy();
  });
});
