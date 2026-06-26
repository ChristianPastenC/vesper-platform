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
    // 1. Brand Header Row Styles
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: insets ? insets.top + verticalScale(4) : verticalScale(16),
      marginBottom: verticalScale(20),
    },
    profileButton: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircleButton: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(21),
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: scale(12),
      position: 'relative',
    },
    badgeContainer: {
      position: 'absolute',
      right: scale(-2),
      top: scale(-2),
      backgroundColor: colors.error,
      borderRadius: scale(8),
      minWidth: scale(16),
      height: scale(16),
      paddingHorizontal: scale(4),
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: scaleFont(9),
      fontWeight: '700',
      lineHeight: scaleFont(11),
      textAlign: 'center',
    },
    // 3. Category Stories Carousel Styles
    categoriesContainer: {
      marginBottom: verticalScale(24),
    },
    categoriesScrollContent: {
      paddingRight: scale(20),
    },
    categoryItem: {
      alignItems: 'center',
      marginRight: scale(16),
      width: scale(72),
    },
    categoryOuterRing: {
      width: scale(64),
      height: scale(64),
      borderRadius: scale(32),
      borderWidth: 1,
      borderColor:
        colors.primary === '#F8FAFC' ? 'rgba(248, 250, 252, 0.2)' : 'rgba(15, 23, 42, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: scale(6),
    },
    categoryInnerCircle: {
      width: scale(56),
      height: scale(56),
      borderRadius: scale(28),
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryText: {
      fontSize: scaleFont(11),
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.1,
    },
    // 5. Seamless Transition Title Styles
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(16),
      marginTop: verticalScale(8),
    },
    sectionHeaderTitle: {
      fontSize: scaleFont(17),
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    seeAllButton: {
      paddingVertical: scale(4),
      paddingHorizontal: scale(6),
    },
    seeAllText: {
      fontSize: scaleFont(13),
      fontWeight: '600',
      color: colors.primary,
    },
  });
