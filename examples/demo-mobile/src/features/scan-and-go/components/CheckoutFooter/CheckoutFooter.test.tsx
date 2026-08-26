import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CheckoutFooter } from './CheckoutFooter';

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
      surface: '#FFFFFF',
      border: '#E2E8F0',
    },
  }),
}));

describe('CheckoutFooter', () => {
  it('renders correctly with correct total', () => {
    const { getByTestId, getByText } = render(
      <CheckoutFooter
        total={100.5}
        isProcessing={false}
        cartIsEmpty={false}
        onPayPress={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId('checkout-footer')).toBeTruthy();
    expect(getByText('scan_and_go.total:')).toBeTruthy();
    expect(getByText('$100.50')).toBeTruthy();
  });

  it('handles button presses', () => {
    const onPayPressMock = jest.fn();
    const onCloseMock = jest.fn();

    const { getByTestId } = render(
      <CheckoutFooter
        total={100.5}
        isProcessing={false}
        cartIsEmpty={false}
        onPayPress={onPayPressMock}
        onClose={onCloseMock}
      />,
    );

    fireEvent.press(getByTestId('pay-btn'));
    expect(onPayPressMock).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('close-btn'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('renders loading state when processing', () => {
    const { getByTestId } = render(
      <CheckoutFooter
        total={100.5}
        isProcessing={true}
        cartIsEmpty={false}
        onPayPress={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByTestId('checkout-footer')).toBeTruthy();
  });

  it('renders disabled state when cart is empty', () => {
    const { getByTestId } = render(
      <CheckoutFooter
        total={0}
        isProcessing={false}
        cartIsEmpty={true}
        onPayPress={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByTestId('checkout-footer')).toBeTruthy();
  });
});
