import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    sectionContainer: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    transactionsList: {
      paddingLeft: 20,
      paddingRight: 8,
    },
    productCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginRight: 12,
      width: 160,
    },
    productName: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 12,
    },
    productPrice: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 16,
    },
    productFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cartIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
