import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: scale(14),
      height: verticalScale(48),
      paddingHorizontal: scale(14),
      marginBottom: verticalScale(24),
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.01,
      shadowRadius: 4,
      elevation: 1,
    },
    searchIcon: {
      marginRight: scale(10),
    },
    searchPlaceholderText: {
      color: colors.text + '70',
      fontSize: scaleFont(14),
      flex: 1,
    },
    searchSeparator: {
      width: 1,
      height: verticalScale(20),
      backgroundColor: colors.border,
      marginHorizontal: scale(12),
    },
    scanTriggerButton: {
      padding: scale(4),
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
