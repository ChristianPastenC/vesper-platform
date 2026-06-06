import { StyleSheet } from 'react-native';
import { ThemeColors } from '../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    body: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '400',
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.text + 'CC', // 80% opacity
      fontSize: 18,
      fontWeight: '500',
    },
    caption: {
      color: colors.text + '99', // 60% opacity
      fontSize: 12,
      fontWeight: '400',
    },
    bold: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
  });
