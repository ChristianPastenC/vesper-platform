import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    camera: {
      flex: 1,
    },
    overlayTextContainer: {
      position: 'absolute',
      top: insets ? insets.top + verticalScale(24) : verticalScale(40),
      left: scale(20),
      right: scale(20),
      alignItems: 'center',
      zIndex: 2,
    },
    scanHint: {
      color: '#FFFFFF',
      fontSize: scaleFont(16),
      fontWeight: '600',
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
      letterSpacing: -0.2,
    },
  });
