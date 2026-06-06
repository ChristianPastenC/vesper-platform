import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';
import { useTheme } from '../core/theme/useTheme';

jest.mock('../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('Button Component', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        primary: '#6200EE',
        error: '#B00020',
        text: '#121212',
        border: '#E0E0E0',
      },
      isDarkMode: false,
    });
  });

  it('renders title correctly when idle', () => {
    const { getByText } = render(<Button title="Submit" status="idle" />);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={onPressMock} />
    );
    fireEvent.press(getByText('Click Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('disables pressing when loading', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <Button
        title="Click Me"
        status="loading"
        onPress={onPressMock}
        testID="btn"
      />
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPressMock).not.toHaveBeenCalled();
  });
});
