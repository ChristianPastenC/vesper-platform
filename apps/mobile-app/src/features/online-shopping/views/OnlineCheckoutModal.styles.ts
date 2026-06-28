import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'space-between',
    },
    content: {
      padding: scale(24),
    },
    title: {
      marginBottom: verticalScale(24),
      textAlign: 'center',
    },
    footer: {
      padding: scale(24),
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confirmBtn: {
      marginBottom: verticalScale(12),
    },
  });
