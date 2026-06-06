import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: scale(32),
    },
    emptyText: {
      fontSize: scaleFont(16),
      textAlign: 'center',
      color: colors.text + '99',
    },
    listContent: {
      paddingHorizontal: scale(16),
      paddingTop: insets ? insets.top + verticalScale(8) : verticalScale(16),
      paddingBottom: verticalScale(16),
    },
    footer: {
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(16),
      paddingBottom: insets ? insets.bottom + verticalScale(16) : verticalScale(16),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    addressSection: {
      marginBottom: verticalScale(16),
    },
    addressText: {
      marginTop: verticalScale(4),
      color: colors.text + 'AA',
      fontSize: scaleFont(14),
    },
    totalSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(20),
    },
    totalText: {
      color: colors.primary,
      fontSize: scaleFont(20),
    },
    checkoutBtn: {
      marginBottom: verticalScale(12),
    },
    clearBtn: {
      borderColor: colors.error,
    },
  });
