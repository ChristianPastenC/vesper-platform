import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 16,
    },
    details: {
      marginTop: 4,
    },
    total: {
      fontSize: 16,
      color: colors.primary,
    },
  });
