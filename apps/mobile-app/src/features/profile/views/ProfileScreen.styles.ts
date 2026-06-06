import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    title: {
      textAlign: 'center',
      marginBottom: 6,
      color: colors.primary,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 24,
    },
    sessionText: {
      textAlign: 'center',
      fontSize: 15,
      color: colors.text + 'CC',
      marginBottom: 24,
      lineHeight: 22,
    },
    errorContainer: {
      backgroundColor: colors.error + '15',
      borderColor: colors.error,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      textAlign: 'center',
      fontWeight: '600',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      marginBottom: 6,
      color: colors.text + 'CC',
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      color: colors.text,
      backgroundColor: colors.background,
    },
    actionBtn: {
      marginTop: 8,
      height: 50,
      borderRadius: 8,
    },
    toggleBtn: {
      marginTop: 12,
    },
  });
