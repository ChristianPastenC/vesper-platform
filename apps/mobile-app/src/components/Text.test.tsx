import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from './Text';
import { useTheme } from '../core/theme/useTheme';

jest.mock('../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('Text Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        text: '#121212',
      },
      isDarkMode: false,
    });
  });

  it('renders children correctly', () => {
    const { getByText } = render(<Text>Hello World</Text>);
    expect(getByText('Hello World')).toBeTruthy();
  });
});
