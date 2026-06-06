import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
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
      borderRadius: 12,
      padding: 16,
      margin: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    networkIcon: {
      marginRight: 12,
    },
    networkInfo: {
      flex: 1,
    },
    networkStatusLabel: {
      marginTop: 4,
      fontSize: 13,
      color: colors.text + '99',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '15',
      borderColor: colors.error,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    errorIcon: {
      marginRight: 8,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text + '99',
      textAlign: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    totalSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    totalText: {
      color: colors.primary,
    },
    payBtn: {
      marginBottom: 12,
    },
  });
