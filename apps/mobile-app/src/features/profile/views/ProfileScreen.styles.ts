import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      margin: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    avatarText: {
      fontSize: 24,
      color: colors.primary,
    },
    headerInfo: {
      flex: 1,
    },
    welcomeText: {
      fontSize: 18,
      color: colors.text,
      marginBottom: 4,
    },
    statusText: {
      fontSize: 14,
      color: colors.text + '99',
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.text + '80',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
      marginLeft: 4,
    },
    optionsList: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowText: {
      fontSize: 16,
      marginLeft: 12,
      color: colors.text,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowValueText: {
      fontSize: 14,
      color: colors.text + '80',
      marginRight: 8,
      textTransform: 'capitalize',
    },
  });
