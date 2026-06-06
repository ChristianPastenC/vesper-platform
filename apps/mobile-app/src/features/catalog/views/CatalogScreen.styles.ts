import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 16,
    },
    headerCartButton: {
      marginRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    badgeContainer: {
      position: 'absolute',
      right: -6,
      top: -6,
      backgroundColor: colors.error,
      borderRadius: 9,
      width: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
  });
