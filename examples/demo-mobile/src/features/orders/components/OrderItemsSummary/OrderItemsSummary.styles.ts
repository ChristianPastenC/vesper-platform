import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface + 'E6',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border + 'CC',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    itemInfo: {
      flex: 1,
      marginRight: 16,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    itemQty: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.7,
      marginTop: 4,
    },
    itemPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
  });
