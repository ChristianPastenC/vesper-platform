import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: scale(32),
    },
    emptyText: {
      fontSize: scaleFont(16),
      textAlign: 'center',
      color: colors.text + '80',
      lineHeight: 22,
    },
    listContent: {
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(16),
    },
  });
