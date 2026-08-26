import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterTabs } from './FilterTabs';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#6200EE',
      surface: '#FFFFFF',
      text: '#121212',
    },
  }),
}));

describe('FilterTabs', () => {
  it('renders correctly and handles tab clicks', () => {
    const onTabChange = jest.fn();
    const { getByTestId } = render(<FilterTabs activeTab="active" onTabChange={onTabChange} />);

    expect(getByTestId('tab-active')).toBeTruthy();
    expect(getByTestId('tab-past')).toBeTruthy();

    fireEvent.press(getByTestId('tab-past'));
    expect(onTabChange).toHaveBeenCalledWith('past');
  });
});
