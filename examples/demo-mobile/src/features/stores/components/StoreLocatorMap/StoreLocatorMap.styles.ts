import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: scale(16),
      overflow: 'hidden',
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.border + '80',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
      backgroundColor: colors.surface + 'E6',
    },
    map: {
      width: '100%',
      height: '100%',
    },
  });
