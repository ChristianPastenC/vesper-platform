import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, scaleFont, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface + 'E6', // Glassmorphism
      padding: scale(20),
      borderRadius: scale(24),
      marginBottom: verticalScale(24),
      borderWidth: 1,
      borderColor: colors.border + '80',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
    avatarContainer: {
      width: scale(64),
      height: scale(64),
      borderRadius: scale(32),
      backgroundColor: colors.primary + '1A',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: scale(16),
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    avatarText: {
      fontSize: scaleFont(24),
      color: colors.primary,
    },
    headerInfo: {
      flex: 1,
    },
    welcomeText: {
      fontSize: scaleFont(22),
      color: colors.text,
      marginBottom: verticalScale(4),
      fontWeight: 'bold',
    },
    statusText: {
      fontSize: scaleFont(14),
      color: colors.text + '99',
    },
  });
