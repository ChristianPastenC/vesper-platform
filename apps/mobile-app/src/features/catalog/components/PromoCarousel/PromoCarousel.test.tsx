import React from 'react';
import { render } from '@testing-library/react-native';
import { PromoCarousel } from './PromoCarousel';

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

describe('PromoCarousel', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = render(<PromoCarousel />);
    expect(getByTestId('promo-carousel-container')).toBeTruthy();
    expect(getByText('catalog.heroTag')).toBeTruthy();
    expect(getByText('catalog.heroTitle')).toBeTruthy();
    expect(getByText('catalog.heroSubText')).toBeTruthy();
  });
});
