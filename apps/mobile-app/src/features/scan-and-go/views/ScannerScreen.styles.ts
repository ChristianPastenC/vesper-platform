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
    viewfinderContainer: {
      flex: 1,
      backgroundColor: '#000000',
    },
    darkOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    middleRow: {
      flexDirection: 'row',
      height: scale(220),
    },
    viewfinderFrame: {
      width: scale(220),
      height: scale(220),
      position: 'relative',
      backgroundColor: 'transparent',
    },
    corner: {
      position: 'absolute',
      width: scale(24),
      height: scale(24),
      borderColor: colors.primary,
      borderWidth: 4,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    laserLine: {
      position: 'absolute',
      left: scale(12),
      right: scale(12),
      top: scale(110),
      height: 2,
      backgroundColor: '#FF3B30',
      shadowColor: '#FF3B30',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    overlayTextContainer: {
      position: 'absolute',
      top: insets ? insets.top + verticalScale(16) : verticalScale(32),
      left: scale(16),
      right: scale(16),
      alignItems: 'center',
    },
    scanHint: {
      color: '#FFFFFF',
      fontSize: scaleFont(15),
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    toast: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: scale(12),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(16),
      marginTop: verticalScale(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    toastText: {
      color: colors.text,
      fontSize: scaleFont(14),
      textAlign: 'center',
    },
    controls: {
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(16),
      paddingBottom: insets ? insets.bottom + verticalScale(16) : verticalScale(16),
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    scanBtn: {
      marginBottom: verticalScale(12),
    },
    checkoutBtn: {
      borderColor: colors.primary,
    },
  });
