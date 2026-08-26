import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, scaleFont, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: verticalScale(24),
    },
    sectionTitle: {
      fontSize: scaleFont(14),
      fontWeight: 'bold',
      color: colors.text + '99',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: verticalScale(12),
      marginLeft: scale(8),
    },
    optionsList: {
      backgroundColor: colors.surface + 'E6', // Glassmorphism
      borderRadius: scale(20),
      borderWidth: 1,
      borderColor: colors.border + '80',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    rowLast: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: verticalScale(18),
      paddingHorizontal: scale(20),
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowText: {
      fontSize: scaleFont(16),
      marginLeft: scale(14),
      fontWeight: '600',
    },
  });
