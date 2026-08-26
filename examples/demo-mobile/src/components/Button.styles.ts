import { StyleSheet } from 'react-native';
import { ThemeColors } from '../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      height: verticalScale(54),
      borderRadius: scale(16),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: scale(20),
      flexDirection: 'row',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: scale(2) },
      shadowOpacity: 0.06,
      shadowRadius: scale(6),
      elevation: 2,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    danger: {
      backgroundColor: colors.error,
      shadowColor: colors.error,
      shadowOpacity: 0.15,
      shadowRadius: scale(6),
    },
    disabled: {
      opacity: 0.4,
      shadowOpacity: 0,
      elevation: 0,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    iconContainer: {
      marginRight: scale(8),
    },
    text: {
      color: colors.primary === '#F8FAFC' ? '#09090B' : '#FFFFFF',
      fontSize: scaleFont(16),
      fontWeight: '600',
      letterSpacing: -0.1,
    },
    textSecondary: {
      color: colors.text,
    },
  });
