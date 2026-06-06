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
    networkToggleCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: scale(12),
      padding: scale(16),
      marginHorizontal: scale(16),
      marginTop: insets ? insets.top + verticalScale(8) : verticalScale(16),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.border,
    },
    networkIcon: {
      marginRight: scale(12),
    },
    networkInfo: {
      flex: 1,
    },
    networkStatusLabel: {
      marginTop: verticalScale(4),
      fontSize: scaleFont(13),
      color: colors.text + '99',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '15',
      borderColor: colors.error,
      borderWidth: 1,
      borderRadius: scale(8),
      padding: scale(12),
      marginHorizontal: scale(16),
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: scale(32),
    },
    emptyText: {
      fontSize: scaleFont(16),
      color: colors.text + '99',
      textAlign: 'center',
    },
    listContent: {
      paddingHorizontal: scale(16),
    },
    footer: {
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(16),
      paddingBottom: insets ? insets.bottom + verticalScale(16) : verticalScale(16),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
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
    payBtn: {
      marginBottom: verticalScale(12),
    },
  });
