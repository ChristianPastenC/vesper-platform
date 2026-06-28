import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, scaleFont, verticalScale } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    header: {
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(16),
    },
    title: {
      fontSize: scaleFont(24),
      fontWeight: 'bold',
      color: colors.text,
    },
    mapContainer: {
      height: verticalScale(250),
      marginHorizontal: scale(16),
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(16),
    },
    listTitle: {
      fontSize: scaleFont(18),
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: verticalScale(12),
    },
  });
