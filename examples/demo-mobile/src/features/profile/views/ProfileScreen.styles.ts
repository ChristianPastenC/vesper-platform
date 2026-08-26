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
      paddingHorizontal: scale(16),
    },
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(18),
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowText: {
      fontSize: scaleFont(16),
      marginLeft: scale(14),
      color: colors.text,
      fontWeight: '600',
    },
    rowValueText: {
      fontSize: scaleFont(14),
      color: colors.text + '99',
      textTransform: 'capitalize',
      fontWeight: '500',
    },
  });
