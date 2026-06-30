import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, scaleFont, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: scale(12),
      padding: scale(16),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: scaleFont(14),
      marginBottom: verticalScale(6),
      color: colors.text + '99',
    },
    value: {
      fontSize: scaleFont(16),
    },
    input: {
      fontSize: scaleFont(16),
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: verticalScale(8),
    },
  });
