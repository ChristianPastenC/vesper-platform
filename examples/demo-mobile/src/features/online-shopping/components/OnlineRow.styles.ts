import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(16),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    info: {
      flex: 1,
      paddingRight: scale(12),
    },
    name: {
      fontSize: scaleFont(15),
      fontWeight: '600',
      color: colors.text,
      lineHeight: scaleFont(20),
    },
    details: {
      marginTop: verticalScale(4),
      fontSize: scaleFont(12),
      color: colors.text + '99',
    },
    total: {
      fontSize: scaleFont(15),
      fontWeight: '700',
      color: colors.text,
    },
  });
