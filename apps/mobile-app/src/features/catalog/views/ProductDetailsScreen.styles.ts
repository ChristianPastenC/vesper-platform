import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    imageContainer: {
      height: 220,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    imageIcon: {
      fontSize: 80,
      color: colors.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      flex: 1,
      marginRight: 12,
    },
    price: {
      fontSize: 24,
      color: colors.primary,
    },
    barcodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
      marginBottom: 24,
    },
    barcodeText: {
      fontSize: 13,
      marginLeft: 6,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 15,
      lineHeight: 22,
    },
    specsTable: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    specRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    specRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    specLabel: {
      fontSize: 15,
      opacity: 0.7,
    },
    specValue: {
      fontSize: 15,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    actionBtn: {
      flex: 1,
      height: 48,
      borderRadius: 10,
    },
    spacing: {
      width: 12,
    },
  });
