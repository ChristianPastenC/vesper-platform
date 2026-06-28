import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, scaleFont, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    cardContainer: {
      backgroundColor: colors.surface + 'E6', // glassmorphism
      borderRadius: scale(16),
      padding: scale(16),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.border + '80',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    storeName: {
      fontSize: scaleFont(16),
      fontWeight: 'bold',
      color: colors.text,
    },
    distanceBadge: {
      backgroundColor: colors.primary + '1A',
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(4),
      borderRadius: scale(8),
    },
    distanceText: {
      fontSize: scaleFont(12),
      color: colors.primary,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: verticalScale(8),
    },
    infoText: {
      fontSize: scaleFont(14),
      color: colors.text + '99',
      marginLeft: scale(8),
    },
    actionButton: {
      marginTop: verticalScale(16),
      backgroundColor: colors.primary,
      paddingVertical: verticalScale(10),
      borderRadius: scale(8),
      alignItems: 'center',
    },
    actionText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: scaleFont(14),
    },
  });
