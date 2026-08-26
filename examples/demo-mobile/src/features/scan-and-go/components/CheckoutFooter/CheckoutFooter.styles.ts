import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(12) : verticalScale(20),
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      backgroundColor: colors.surface,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    totalSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(16),
    },
    totalText: {
      color: colors.primary,
      fontSize: scaleFont(24),
      fontWeight: '800',
    },
    payBtn: {
      marginBottom: verticalScale(12),
    },
  });
