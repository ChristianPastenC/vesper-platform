import { renderHook } from '@testing-library/react-native';
import { useTabNavigator } from './useTabNavigator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/theme/useTheme';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../core/theme/useTheme', () => ({
  useTheme: jest.fn(),
}));

describe('useTabNavigator', () => {
  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });
    (useTheme as jest.Mock).mockReturnValue({ colors: { primary: '#000' } });
  });

  it('returns translation function and colors', () => {
    const { result } = renderHook(() => useTabNavigator());
    expect(result.current.t('test')).toBe('test');
    expect(result.current.colors.primary).toBe('#000');
  });

  it('returns correct icon names for tabs', () => {
    const { result } = renderHook(() => useTabNavigator());

    expect(result.current.getTabBarIconName('HomeTab')).toBe('home-outline');
    expect(result.current.getTabBarIconName('CatalogTab')).toBe('grid-outline');
    expect(result.current.getTabBarIconName('ScanAndGoTab')).toBe('barcode-outline');
    expect(result.current.getTabBarIconName('ProfileTab')).toBe('person-outline');
  });
});
