import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddToCartFooter } from './AddToCartFooter';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
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

// Mock the Button component to avoid Host Component detection issues
jest.mock('../../../../components/Button', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Text, TouchableOpacity } = require('react-native');
  return {
    Button: (props: { title: string; onPress: () => void; testID: string }) => {
      return React.createElement(
        TouchableOpacity,
        { onPress: props.onPress, testID: props.testID },
        React.createElement(Text, null, props.title)
      );
    },
  };
});

describe('AddToCartFooter', () => {
  it('renders correctly and handles interactions', () => {
    const mockOnAddToOnline = jest.fn();
    
    const { getByTestId, getByText, queryByText } = render(
      <AddToCartFooter
        onAddToOnline={mockOnAddToOnline}
      />
    );
    
    expect(getByTestId('add-to-cart-footer')).toBeTruthy();
    expect(getByText('catalog.addToCart')).toBeTruthy();
    expect(queryByText('catalog.addToInStore')).toBeNull();
    
    fireEvent.press(getByTestId('details-add-online-btn'));
    expect(mockOnAddToOnline).toHaveBeenCalledTimes(1);
  });
});
