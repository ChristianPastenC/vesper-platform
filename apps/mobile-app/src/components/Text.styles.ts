import { StyleSheet } from 'react-native';
import { ThemeColors } from '../core/theme/colors';
import { scaleFont, verticalScale } from '../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    body: {
      color: colors.text,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(22),
      fontWeight: '400',
      letterSpacing: -0.1,
    },
    title: {
      color: colors.text,
      fontSize: scaleFont(26),
      lineHeight: scaleFont(34),
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: colors.text + 'D9', // ~85% opacity
      fontSize: scaleFont(18),
      lineHeight: scaleFont(24),
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    caption: {
      color: colors.text + '80', // 50% opacity
      fontSize: scaleFont(12),
      lineHeight: scaleFont(16),
      fontWeight: '400',
      letterSpacing: 0,
    },
    bold: {
      color: colors.text,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(22),
      fontWeight: '700',
      letterSpacing: -0.1,
    },
  });
