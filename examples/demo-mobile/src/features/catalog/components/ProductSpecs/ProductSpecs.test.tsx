import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductSpecs } from './ProductSpecs';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

describe('ProductSpecs', () => {
  it('renders correctly', () => {
    const mockSpecs = [
      { labelKey: 'catalog.specWeight', value: '1.5kg' },
      { labelKey: 'catalog.specBrand', value: 'catalog.brandApple', isTranslationValue: true },
    ];

    const { getByTestId, getByText } = render(<ProductSpecs specifications={mockSpecs} />);
    expect(getByTestId('product-specs-container')).toBeTruthy();
    expect(getByText('catalog.descriptionTitle')).toBeTruthy();
    expect(getByText('catalog.specificationsTitle')).toBeTruthy();
    expect(getByText('catalog.specWeight')).toBeTruthy();
    expect(getByText('1.5kg')).toBeTruthy();
    expect(getByText('catalog.specBrand')).toBeTruthy();
    expect(getByText('catalog.brandApple')).toBeTruthy();
  });
});
