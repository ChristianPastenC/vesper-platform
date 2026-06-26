import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    networkToggleCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      padding: scale(16),
      marginHorizontal: scale(20),
      marginTop: insets ? insets.top + verticalScale(12) : verticalScale(20),
      marginBottom: verticalScale(16),
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.01,
      shadowRadius: 6,
      elevation: 1,
    },
    networkIcon: {
      marginRight: scale(12),
    },
    networkInfo: {
      flex: 1,
    },
    networkStatusLabel: {
      marginTop: verticalScale(2),
      fontSize: scaleFont(13),
      color: colors.text + '80',
    },
  });
