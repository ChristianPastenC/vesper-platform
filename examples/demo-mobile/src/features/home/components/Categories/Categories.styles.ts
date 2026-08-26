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
    categoriesGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },
    categoryCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: '23%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    categoryText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
  });
