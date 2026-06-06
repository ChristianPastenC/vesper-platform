import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScannerScreen } from './ScannerScreen';
import { useScanner } from '../hooks/useScanner';
import { useTheme } from '../../../core/theme/useTheme';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('../hooks/useScanner', () => ({
  useScanner: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('ScannerScreen View', () => {
  const mockNavigate = jest.fn();
  const mockSimulate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
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
    (useScanner as jest.Mock).mockReturnValue({
      lastScanned: null,
      simulateScan: mockSimulate,
      t: (key: string) => key,
    });
    (useAppStore as jest.Mock).mockReturnValue(3); // Mock cart itemsCount = 3
  });

  it('renders scanner screen UI elements', () => {
    const { getByText } = render(<ScannerScreen />);

    expect(getByText('scan_and_go.scanHint')).toBeTruthy();
    expect(getByText('scan_and_go.simulateScan')).toBeTruthy();
    expect(getByText('scan_and_go.checkoutTitle (3)')).toBeTruthy();
  });

  it('triggers simulateScan when clicking simulator button', () => {
    const { getByText } = render(<ScannerScreen />);
    fireEvent.press(getByText('scan_and_go.simulateScan'));
    expect(mockSimulate).toHaveBeenCalledTimes(1);
  });

  it('navigates to InStoreCheckoutModal when checkout is pressed', () => {
    const { getByText } = render(<ScannerScreen />);
    fireEvent.press(getByText('scan_and_go.checkoutTitle (3)'));
    expect(mockNavigate).toHaveBeenCalledWith('InStoreCheckoutModal');
  });
});
