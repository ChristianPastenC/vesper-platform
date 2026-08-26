import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets: EdgeInsets) =>
  StyleSheet.create({
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(20),
      paddingBottom: insets.bottom > 0 ? insets.bottom + verticalScale(12) : verticalScale(20),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 8,
    },
    addressSection: {
      marginBottom: verticalScale(16),
    },
    addressText: {
      marginTop: verticalScale(4),
      color: colors.text + '99',
      fontSize: scaleFont(14),
      lineHeight: 20,
    },
    totalSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(16),
    },
    totalText: {
      color: colors.primary,
      fontSize: scaleFont(22),
      fontWeight: '700',
    },
    checkoutBtn: {
      marginBottom: verticalScale(12),
    },
    clearBtn: {
      borderColor: colors.border,
    },
  });
