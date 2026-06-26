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
    price: {
      color: colors.primary,
      marginTop: verticalScale(4),
    },
    loaderSection: {
      alignItems: 'center',
      marginTop: verticalScale(24),
    },
    loaderText: {
      marginTop: verticalScale(12),
      fontSize: scaleFont(14),
      color: colors.text + '99',
    },
  });
