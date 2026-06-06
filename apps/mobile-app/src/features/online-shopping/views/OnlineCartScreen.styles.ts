import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
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
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      color: colors.text + '99',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    addressSection: {
      marginBottom: 16,
    },
    addressText: {
      marginTop: 4,
      color: colors.text + 'AA',
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
    checkoutBtn: {
      marginBottom: 12,
    },
    clearBtn: {
      borderColor: colors.error,
    },
  });
