import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';
import { useTheme } from '../../core/theme/useTheme';
import { Text } from 'react-native';

jest.mock('../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('SearchBar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        surface: '#FFFFFF',
        text: '#121212',
        textSecondary: '#757575',
        border: '#E0E0E0',
      },
    });
  });

  it('renders correctly with default props', () => {
    const { getByTestId, getByPlaceholderText } = render(<SearchBar placeholder="Search..." />);
    expect(getByTestId('search-bar-container')).toBeTruthy();
    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('handles onChangeText', () => {
    const mockOnChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar placeholder="Search..." onChangeText={mockOnChangeText} />,
    );

    fireEvent.changeText(getByPlaceholderText('Search...'), 'New text');
    expect(mockOnChangeText).toHaveBeenCalledWith('New text');
  });

  it('renders as a touchable when not editable and onPress is provided', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <SearchBar editable={false} onPress={mockOnPress} placeholder="Search..." />,
    );

    const touchable = getByTestId('search-bar-touchable');
    expect(touchable).toBeTruthy();

    fireEvent.press(touchable);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders rightElement if provided', () => {
    const { getByText } = render(<SearchBar rightElement={<Text>Right Element</Text>} />);
    expect(getByText('Right Element')).toBeTruthy();
  });
});
