import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScannerControls } from './ScannerControls';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#10B981',
      text: '#000000',
      border: '#E2E8F0',
    },
  }),
}));

describe('ScannerControls', () => {
  it('renders buttons and handles press events correctly', () => {
    const simulateScanMock = jest.fn();
    const checkoutMock = jest.fn();

    const { getByTestId, getByText } = render(
      <ScannerControls
        itemsCount={3}
        onSimulateScan={simulateScanMock}
        onCheckout={checkoutMock}
      />
    );

    expect(getByTestId('scanner-controls')).toBeTruthy();
    
    const simulateBtn = getByTestId('simulate-scan-btn');
    const checkoutBtn = getByTestId('checkout-btn');

    expect(getByText('scan_and_go.simulateScan')).toBeTruthy();
    expect(getByText('scan_and_go.checkoutTitle (3)')).toBeTruthy();

    fireEvent.press(simulateBtn);
    expect(simulateScanMock).toHaveBeenCalledTimes(1);

    fireEvent.press(checkoutBtn);
    expect(checkoutMock).toHaveBeenCalledTimes(1);
  });
});
