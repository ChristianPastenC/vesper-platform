import { StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../core/theme/responsive';

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
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.01,
      shadowRadius: 4,
      elevation: 1,
      flex: 1, // Usually takes up remaining space if in a header
    },
    searchIcon: {
      marginRight: scale(10),
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: scaleFont(14),
      paddingVertical: 0, // Fix alignment on Android
      ...Platform.select({
        android: {
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
      }),
    },
    searchSeparator: {
      width: 1,
      height: verticalScale(20),
      backgroundColor: colors.border,
      marginHorizontal: scale(12),
    },
  });
