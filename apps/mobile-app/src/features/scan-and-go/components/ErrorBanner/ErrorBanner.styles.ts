import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '10',
      borderColor: colors.error + '30',
      borderWidth: 1,
      borderRadius: scale(12),
      padding: scale(14),
      marginHorizontal: scale(20),
      marginBottom: verticalScale(16),
    },
    errorIcon: {
      marginRight: scale(8),
    },
    errorText: {
      color: colors.error,
      fontSize: scaleFont(13),
      fontWeight: '600',
      flex: 1,
    },
  });
