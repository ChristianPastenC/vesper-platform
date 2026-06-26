import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors, insets: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20,
    },
    headerCartButton: {
      marginRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    badgeContainer: {
      position: 'absolute',
      right: -4,
      top: -4,
      backgroundColor: colors.error,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700',
      lineHeight: 11,
      textAlign: 'center',
    },
  });
