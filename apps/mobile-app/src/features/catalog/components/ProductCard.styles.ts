import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    name: {
      fontSize: 18,
      flex: 1,
      marginRight: 8,
    },
    price: {
      fontSize: 18,
      color: colors.primary,
    },
    barcode: {
      marginBottom: 16,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
    },
    spacing: {
      width: 12,
    },
  });
