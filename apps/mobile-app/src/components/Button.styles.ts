import { StyleSheet } from 'react-native';
import { ThemeColors } from '../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      flexDirection: 'row',
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    danger: {
      backgroundColor: colors.error,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    textSecondary: {
      color: colors.primary,
    },
  });
