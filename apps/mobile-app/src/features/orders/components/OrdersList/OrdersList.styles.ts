import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text,
      opacity: 0.5,
      marginTop: 16,
    },
  });
