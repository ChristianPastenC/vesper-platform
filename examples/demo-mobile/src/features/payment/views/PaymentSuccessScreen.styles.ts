import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'space-between',
      padding: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmarkCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    checkmarkIcon: {
      fontSize: 40,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    successTitle: {
      textAlign: 'center',
      marginBottom: 24,
    },
    orderLabel: {
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    orderId: {
      fontSize: 20,
      color: colors.primary,
      marginBottom: 32,
    },
    qrMockContainer: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qrBox: {
      width: 120,
      height: 120,
      justifyContent: 'space-around',
      padding: 8,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
    },
    qrRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    qrDot: {
      width: 20,
      height: 20,
      backgroundColor: '#E0E0E0',
      borderRadius: 4,
    },
    qrActive: {
      backgroundColor: '#121212',
    },
    qrHint: {
      marginTop: 12,
    },
    footer: {
      width: '100%',
    },
    doneBtn: {
      width: '100%',
    },
  });
