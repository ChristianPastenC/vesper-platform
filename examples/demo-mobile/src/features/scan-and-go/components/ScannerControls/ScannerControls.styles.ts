import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    controlsContainer: {
      position: 'absolute',
      bottom: insets ? insets.bottom + verticalScale(24) : verticalScale(24),
      left: scale(20),
      right: scale(20),
      padding: scale(16),
      borderRadius: scale(24),
      zIndex: 10,
    },
    glassBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(24, 24, 27, 0.75)' : 'rgba(255, 255, 255, 0.95)',
      borderRadius: scale(24),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    scanBtn: {
      marginBottom: verticalScale(12),
    },
    checkoutBtn: {
      borderColor: colors.border,
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
  });
