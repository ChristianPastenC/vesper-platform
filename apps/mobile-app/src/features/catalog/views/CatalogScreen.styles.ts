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
    listContent: {
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(12),
      paddingBottom: insets ? insets.bottom + verticalScale(20) : verticalScale(20),
    },
    columnWrapper: {
      justifyContent: 'space-between',
    },
    // 1. Brand Header Row Styles
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: insets ? insets.top + verticalScale(4) : verticalScale(16),
      marginBottom: verticalScale(20),
    },
    brandName: {
      fontSize: scaleFont(24),
      fontWeight: '300',
      color: colors.text,
      letterSpacing: 2.5,
      textTransform: 'uppercase',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircleButton: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(21),
      backgroundColor: colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
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
    // 2. Search & Scan Bar Styles
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
      borderColor: colors.primary === '#F8FAFC' ? 'rgba(248, 250, 252, 0.2)' : 'rgba(15, 23, 42, 0.1)',
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
    // 4. Hero Promotional Banner Styles
    heroBanner: {
      borderRadius: scale(20),
      padding: scale(20),
      marginBottom: verticalScale(28),
      backgroundColor: colors.primary === '#F8FAFC' ? '#18181B' : '#0F172A',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 4,
    },
    heroMicroCapsule: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      paddingHorizontal: scale(10),
      paddingVertical: scale(3),
      borderRadius: scale(12),
      alignSelf: 'flex-start',
      marginBottom: verticalScale(8),
    },
    heroMicroText: {
      color: '#FFFFFF',
      fontSize: scaleFont(10),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: scaleFont(22),
      lineHeight: verticalScale(28),
      fontWeight: '700',
      marginBottom: verticalScale(6),
    },
    heroSubText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: scaleFont(13),
      lineHeight: verticalScale(18),
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
