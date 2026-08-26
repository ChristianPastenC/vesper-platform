import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, scaleFont, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    errorContainer: {
      backgroundColor: colors.error + '1A',
      padding: scale(12),
      borderRadius: scale(12),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.error + '40',
    },
    errorText: {
      color: colors.error,
      fontSize: scaleFont(14),
      textAlign: 'center',
      fontWeight: '600',
    },
    inputGroup: {
      marginBottom: verticalScale(16),
    },
    label: {
      marginBottom: verticalScale(8),
      color: colors.text,
      fontSize: scaleFont(14),
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.background + '80', // Glassmorphism inset
      borderWidth: 1,
      borderColor: colors.border + '60',
      borderRadius: scale(12),
      padding: scale(14),
      color: colors.text,
      fontSize: scaleFont(16),
    },
    loginBtn: {
      marginTop: verticalScale(24),
      borderRadius: scale(12),
    },
  });
