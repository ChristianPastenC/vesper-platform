import React from 'react';
import { render } from '@testing-library/react-native';
import { CheckoutSummary } from './CheckoutSummary';

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#121212',
      border: '#E0E0E0',
      primary: '#6200EE',
      error: '#B00020',
    },
    isDarkMode: false,
  }),
}));

describe('CheckoutSummary', () => {
  it('renders total correctly', () => {
    const { getByText, queryByTestId } = render(
      <CheckoutSummary
        total={150.5}
        totalLabel="Total Amount"
        isProcessing={false}
        processingMessage="Processing..."
      />
    );

    expect(getByText('Total Amount')).toBeTruthy();
    expect(getByText('$150.50')).toBeTruthy();
    expect(queryByTestId('processing-section')).toBeNull();
  });

  it('renders processing state correctly', () => {
    const { getByTestId, getByText } = render(
      <CheckoutSummary
        total={150.5}
        totalLabel="Total Amount"
        isProcessing={true}
        processingMessage="Processing..."
      />
    );

    expect(getByTestId('processing-section')).toBeTruthy();
    expect(getByText('Processing...')).toBeTruthy();
  });
});
