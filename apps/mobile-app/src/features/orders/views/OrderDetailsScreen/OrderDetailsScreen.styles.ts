import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    headerCard: {
      backgroundColor: colors.surface + 'E6',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border + 'CC',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    orderIdText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    dateText: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.7,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    errorText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      marginTop: 40,
    },
  });
