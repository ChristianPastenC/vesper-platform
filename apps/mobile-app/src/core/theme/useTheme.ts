import { useColorScheme } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { LIGHT_COLORS, DARK_COLORS, ThemeColors } from './colors';

export const useTheme = () => {
  const themeMode = useAppStore((state) => state.themeMode);
  const systemScheme = useColorScheme();

  const isDarkMode =
    themeMode === 'system'
      ? systemScheme === 'dark'
      : themeMode === 'dark';

  const colors: ThemeColors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return {
    colors,
    isDarkMode,
  };
};
