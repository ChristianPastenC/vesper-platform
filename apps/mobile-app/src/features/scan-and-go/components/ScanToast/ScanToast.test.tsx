import React from 'react';
import { render } from '@testing-library/react-native';
import { ScanToast } from './ScanToast';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#10B981',
      border: '#E2E8F0',
    },
  }),
}));

// Mock timer so the test can pass without needing real delays for animations
jest.useFakeTimers();

describe('ScanToast', () => {
  it('does not render when lastScanned is null', () => {
    const { queryByTestId } = render(<ScanToast lastScanned={null} />);
    expect(queryByTestId('scan-toast')).toBeNull();
  });

  it('renders and displays the scanned item', () => {
    const { getByTestId, getByText } = render(<ScanToast lastScanned="123456789" />);
    
    expect(getByTestId('scan-toast')).toBeTruthy();
    expect(getByText('catalog.itemAdded: 123456789')).toBeTruthy();
  });
});
