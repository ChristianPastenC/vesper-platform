import { StyleSheet } from 'react-native';
import { AppTheme } from '../../core/theme/theme';

export const stylesFactory = (colors: AppTheme['colors']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      minHeight: 300,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
    },
    closeButton: {
      padding: 4,
    },
    inputContainer: {
      marginBottom: 24,
    },
    label: {
      marginBottom: 8,
      color: colors.text,
      opacity: 0.8,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    footer: {
      marginTop: 'auto',
      paddingBottom: 20,
    },
  });
