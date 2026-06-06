import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: scale(16),
      paddingTop: insets ? insets.top + verticalScale(8) : verticalScale(16),
      paddingBottom: insets ? insets.bottom + verticalScale(16) : verticalScale(16),
    },
    headerCartButton: {
      marginRight: scale(16),
      flexDirection: 'row',
      alignItems: 'center',
    },
    badgeContainer: {
      position: 'absolute',
      right: scale(-6),
      top: scale(-6),
      backgroundColor: colors.error,
      borderRadius: scale(9),
      width: scale(18),
      height: scale(18),
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: scaleFont(10),
      fontWeight: 'bold',
    },
  });
