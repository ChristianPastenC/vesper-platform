import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CatalogHeader } from './CatalogHeader';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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

describe('CatalogHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId, getByText } = render(<CatalogHeader />);
    expect(getByTestId('catalog-header-container')).toBeTruthy();
    expect(getByText('catalog.searchPlaceholder')).toBeTruthy();
  });

  it('navigates to ScanAndGoTab on scan button press', () => {
    const { getByTestId } = render(<CatalogHeader />);
    const scanBtn = getByTestId('scan-button');
    fireEvent.press(scanBtn);
    expect(mockNavigate).toHaveBeenCalledWith('ScanAndGoTab');
  });
});
