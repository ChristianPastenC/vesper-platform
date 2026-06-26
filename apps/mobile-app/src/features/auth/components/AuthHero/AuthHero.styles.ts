import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      textAlign: 'center',
      marginBottom: verticalScale(8),
      color: colors.text,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: verticalScale(32),
      color: colors.text + '99',
    },
  });
