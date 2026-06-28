import React from 'react';
import { render } from '@testing-library/react-native';
import { TrendingCarousel } from './TrendingCarousel';
import { useTheme } from '../../../../core/theme/useTheme';

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('TrendingCarousel Component', () => {
  const mockT = (key: string) => key;
  const mockProducts = [
    { id: '1', name: 'Silk Blend Shirt', price: '$120.00' },
    { id: '2', name: 'Leather Weekender', price: '$350.00' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        surface: '#FFFFFF',
        text: '#121212',
        textSecondary: '#757575',
        primary: '#6200EE',
        background: '#000000',
      },
    });
  });

  it('renders a list of products', () => {
    const { getByText } = render(<TrendingCarousel products={mockProducts} t={mockT} />);

    expect(getByText('home.trendingTitle')).toBeTruthy();
    expect(getByText('home.seeAll')).toBeTruthy();

    expect(getByText('Silk Blend Shirt')).toBeTruthy();
    expect(getByText('$120.00')).toBeTruthy();

    expect(getByText('Leather Weekender')).toBeTruthy();
    expect(getByText('$350.00')).toBeTruthy();
  });
});
