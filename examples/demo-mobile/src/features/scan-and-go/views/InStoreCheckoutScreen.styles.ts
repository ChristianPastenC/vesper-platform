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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: scale(32),
    },
    emptyText: {
      fontSize: scaleFont(16),
      color: colors.text + '80',
      textAlign: 'center',
      lineHeight: 22,
    },
    listContent: {
      paddingHorizontal: scale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(160) : verticalScale(180),
    },
  });
