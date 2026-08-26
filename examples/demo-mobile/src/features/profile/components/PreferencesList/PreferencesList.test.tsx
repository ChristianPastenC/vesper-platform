import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PreferencesList } from './PreferencesList';
import { useProfile } from '../../hooks/useProfile';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../../hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
      surface: '#F5F5F5',
      primary: '#6200EE',
      border: '#E0E0E0',
    },
  }),
}));

describe('PreferencesList', () => {
  it('renders correctly and toggles theme/language', () => {
    const mockToggleTheme = jest.fn();
    const mockToggleLang = jest.fn();

    (useProfile as jest.Mock).mockReturnValue({
      themeMode: 'system',
      toggleThemeMode: mockToggleTheme,
      language: 'en',
      toggleLanguage: mockToggleLang,
    });

    const { getByTestId, getByText } = render(<PreferencesList />);
    expect(getByText('System')).toBeTruthy();
    expect(getByText('English')).toBeTruthy();

    fireEvent.press(getByTestId('profile-theme-row'));
    expect(mockToggleTheme).toHaveBeenCalled();

    fireEvent.press(getByTestId('profile-lang-row'));
    expect(mockToggleLang).toHaveBeenCalled();
  });

  it('renders spanish correctly', () => {
    (useProfile as jest.Mock).mockReturnValue({
      themeMode: 'dark',
      toggleThemeMode: jest.fn(),
      language: 'es',
      toggleLanguage: jest.fn(),
    });

    const { getByText } = render(<PreferencesList />);
    expect(getByText('Dark')).toBeTruthy();
    expect(getByText('Español')).toBeTruthy();
  });
});
