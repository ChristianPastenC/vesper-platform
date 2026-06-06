import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets ? insets.top + verticalScale(10) : verticalScale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(20) : verticalScale(20),
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      padding: scale(20),
      margin: scale(16),
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: scale(60),
      height: scale(60),
      borderRadius: scale(30),
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: scale(16),
    },
    avatarText: {
      fontSize: scaleFont(24),
      color: colors.primary,
    },
    headerInfo: {
      flex: 1,
    },
    welcomeText: {
      fontSize: scaleFont(18),
      color: colors.text,
      marginBottom: verticalScale(4),
    },
    statusText: {
      fontSize: scaleFont(14),
      color: colors.text + '99',
    },
    section: {
      marginHorizontal: scale(16),
      marginBottom: verticalScale(24),
    },
    sectionTitle: {
      fontSize: scaleFont(13),
      fontWeight: 'bold',
      color: colors.text + '80',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: verticalScale(10),
      marginLeft: scale(4),
    },
    optionsList: {
      backgroundColor: colors.surface,
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(16),
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowText: {
      fontSize: scaleFont(16),
      marginLeft: scale(12),
      color: colors.text,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowValueText: {
      fontSize: scaleFont(14),
      color: colors.text + '80',
      marginRight: scale(8),
      textTransform: 'capitalize',
    },
  });
