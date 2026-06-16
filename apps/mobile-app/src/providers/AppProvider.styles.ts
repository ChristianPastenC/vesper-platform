import { StyleSheet } from 'react-native';
import { ThemeColors } from '../core/theme/colors';

export const createAppProviderStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });
