import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'space-between',
    },
    content: {
      padding: 24,
    },
    title: {
      marginBottom: 24,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 14,
      marginBottom: 6,
      color: colors.text + '99',
    },
    value: {
      fontSize: 16,
    },
    price: {
      color: colors.primary,
      marginTop: 4,
    },
    loaderSection: {
      alignItems: 'center',
      marginTop: 24,
    },
    loaderText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.text + '99',
    },
    footer: {
      padding: 24,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confirmBtn: {
      marginBottom: 12,
    },
  });
