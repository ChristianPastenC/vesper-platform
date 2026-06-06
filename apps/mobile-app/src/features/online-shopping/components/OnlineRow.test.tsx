import React from 'react';
import { render } from '@testing-library/react-native';
import { OnlineRow } from './OnlineRow';
import { useTheme } from '../../../core/theme/useTheme';

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('OnlineRow Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        primary: '#6200EE',
        background: '#FFFFFF',
        text: '#121212',
        border: '#E0E0E0',
      },
      isDarkMode: false,
    });
  });

  it('renders item name, pricing breakdown and total correctly', () => {
    const item = { id: '1', name: 'Item A', price: 10.0, quantity: 3 };
    const { getByText } = render(<OnlineRow item={item} />);

    expect(getByText('Item A')).toBeTruthy();
    expect(getByText('$10.00 x 3')).toBeTruthy();
    expect(getByText('$30.00')).toBeTruthy();
  });
});
