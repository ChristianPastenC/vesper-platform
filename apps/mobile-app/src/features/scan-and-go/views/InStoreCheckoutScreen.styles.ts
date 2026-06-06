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
      borderRadius: scale(16),
      padding: scale(16),
      marginHorizontal: scale(20),
      marginTop: insets ? insets.top + verticalScale(12) : verticalScale(20),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.01,
      shadowRadius: 6,
      elevation: 1,
    },
    networkIcon: {
      marginRight: scale(12),
    },
    networkInfo: {
      flex: 1,
    },
    networkStatusLabel: {
      marginTop: verticalScale(2),
      fontSize: scaleFont(13),
      color: colors.text + '80',
    },
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: scale(32),
    },
    emptyText: {
      fontSize: scaleFont(16),
      color: colors.text + '80',
      textAlign: 'center',
      lineHeight: 22,
    },
    listContent: {
      paddingHorizontal: scale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(160) : verticalScale(180),
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(12) : verticalScale(20),
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
    payBtn: {
      marginBottom: verticalScale(12),
    },
  });
