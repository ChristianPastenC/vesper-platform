import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(12),
      paddingBottom: insets ? insets.bottom + verticalScale(20) : verticalScale(20),
    },
    columnWrapper: {
      justifyContent: 'space-between',
    },
    // State views (Loading/Empty/Error)
    emptyStateContainer: {
      padding: scale(40),
      alignItems: 'center',
    },
    errorIcon: {
      marginBottom: verticalScale(16),
    },
    errorText: {
      color: colors.text,
      textAlign: 'center',
      marginBottom: verticalScale(16),
      fontSize: scaleFont(14),
    },
    emptyText: {
      color: colors.text,
      textAlign: 'center',
      fontSize: scaleFont(14),
    },
    skeletonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: scale(8),
    },
    skeletonCard: {
      width: '45%',
      margin: '2.5%',
      height: verticalScale(220),
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      opacity: 0.6,
    },
  });
