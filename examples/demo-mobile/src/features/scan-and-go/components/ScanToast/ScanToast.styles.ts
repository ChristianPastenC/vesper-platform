import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    toast: {
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: scale(24),
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(24),
      marginTop: verticalScale(24),
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    toastText: {
      color: colors.primary === '#F8FAFC' ? '#F4F4F5' : '#0F172A',
      fontSize: scaleFont(14),
      fontWeight: '600',
      textAlign: 'center',
    },
  });
