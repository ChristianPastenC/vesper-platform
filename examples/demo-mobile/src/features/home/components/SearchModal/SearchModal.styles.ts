import { StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      paddingTop: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(16),
      paddingBottom: verticalScale(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    closeButton: {
      marginRight: scale(12),
      padding: scale(4),
    },
    searchBarWrapper: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      padding: scale(32),
      alignItems: 'center',
    },
    emptyText: {
      fontSize: scaleFont(16),
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: verticalScale(16),
    },
    listContent: {
      padding: scale(16),
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: verticalScale(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '50',
    },
    resultIcon: {
      marginRight: scale(12),
    },
    resultTextContainer: {
      flex: 1,
    },
    resultName: {
      fontSize: scaleFont(14),
      color: colors.text,
      fontWeight: '500',
    },
    resultBarcode: {
      fontSize: scaleFont(12),
      color: colors.textSecondary,
      marginTop: verticalScale(4),
    },
  });
