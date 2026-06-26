import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      paddingBottom: verticalScale(40),
    },
    contentPadding: {
      paddingHorizontal: scale(20),
      marginTop: verticalScale(-40), // Overlaps the hero image
    },
  });
