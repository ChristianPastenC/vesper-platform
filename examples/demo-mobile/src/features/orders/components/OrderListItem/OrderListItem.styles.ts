import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface + 'E6', // 90% opacity
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border + 'CC', // 80% opacity
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderId: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    dateText: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.7,
    },
    totalText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    itemsCount: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.7,
      marginBottom: 8,
    },
    imagesContainer: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    itemImage: {
      width: 40,
      height: 40,
      borderRadius: 8,
      marginRight: 8,
      backgroundColor: colors.border,
    },
  });
