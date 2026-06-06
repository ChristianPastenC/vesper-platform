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
    scrollContainer: {
      paddingHorizontal: scale(20),
      paddingTop: insets ? insets.top + verticalScale(10) : verticalScale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(20) : verticalScale(20),
    },
    imageContainer: {
      height: verticalScale(220),
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(24),
    },
    imageIcon: {
      fontSize: scale(80),
      color: colors.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: verticalScale(16),
    },
    title: {
      fontSize: scaleFont(24),
      flex: 1,
      marginRight: scale(12),
    },
    price: {
      fontSize: scaleFont(24),
      color: colors.primary,
    },
    barcodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingVertical: verticalScale(6),
      paddingHorizontal: scale(12),
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
      marginBottom: verticalScale(24),
    },
    barcodeText: {
      fontSize: scaleFont(13),
      marginLeft: scale(6),
    },
    section: {
      marginBottom: verticalScale(24),
    },
    sectionTitle: {
      fontSize: scaleFont(18),
      marginBottom: verticalScale(8),
    },
    descriptionText: {
      fontSize: scaleFont(15),
      lineHeight: verticalScale(22),
    },
    specsTable: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: scale(12),
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    specRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    specRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
    },
    specLabel: {
      fontSize: scaleFont(15),
      opacity: 0.7,
    },
    specValue: {
      fontSize: scaleFont(15),
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: verticalScale(8),
    },
    actionBtn: {
      flex: 1,
      height: verticalScale(48),
      borderRadius: scale(10),
    },
    spacing: {
      width: scale(12),
    },
  });
