import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Categories } from './Categories';
import { useTheme } from '../../../../core/theme/useTheme';

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('Categories Component', () => {
  const mockNavigateToCatalog = jest.fn();
  const mockNavigateToScanner = jest.fn();
  const mockT = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        surface: '#FFFFFF',
        text: '#121212',
        textSecondary: '#757575',
        primary: '#6200EE',
      },
    });
  });

  it('renders correctly and handles presses', () => {
    const { getByTestId, getByText } = render(
      <Categories
        navigateToCatalog={mockNavigateToCatalog}
        navigateToScanner={mockNavigateToScanner}
        t={mockT}
      />
    );

    expect(getByText('home.categoriesTitle')).toBeTruthy();
    expect(getByText('home.shopOnline')).toBeTruthy();

    fireEvent.press(getByTestId('action-catalog'));
    expect(mockNavigateToCatalog).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('action-scan'));
    expect(mockNavigateToScanner).toHaveBeenCalledTimes(1);
  });
});
