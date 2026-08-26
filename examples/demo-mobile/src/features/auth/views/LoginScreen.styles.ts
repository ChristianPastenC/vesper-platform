import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface + 'E6', // Glassmorphism: semi-transparent surface
      borderRadius: 24, // Rounder corners for modern feel
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border + '80', // Subtle transparent border
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
  });
