import { renderHook } from '@testing-library/react-native';
import { useTheme } from './useTheme';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { LIGHT_COLORS, DARK_COLORS } from './colors';

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns dark theme when themeMode is dark', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => selector({ themeMode: 'dark' }));
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDarkMode).toBe(true);
    expect(result.current.colors).toEqual(DARK_COLORS);
  });

  it('returns light theme when themeMode is light', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => selector({ themeMode: 'light' }));
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDarkMode).toBe(false);
    expect(result.current.colors).toEqual(LIGHT_COLORS);
  });

  it('returns system theme when themeMode is system', () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => selector({ themeMode: 'system' }));
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDarkMode).toBe(true);
    expect(result.current.colors).toEqual(DARK_COLORS);
  });
});
