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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    middleRow: {
      flexDirection: 'row',
      height: scale(240),
    },
    viewfinderFrame: {
      width: scale(240),
      height: scale(240),
      position: 'relative',
      backgroundColor: 'transparent',
      borderRadius: 24,
      overflow: 'hidden',
    },
    corner: {
      position: 'absolute',
      width: scale(32),
      height: scale(32),
      borderColor: colors.primary,
      borderWidth: 3,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 16,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: 16,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: 16,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: 16,
    },
    laserLine: {
      position: 'absolute',
      left: scale(16),
      right: scale(16),
      top: scale(120),
      height: 2,
      backgroundColor: colors.primary === '#F8FAFC' ? '#34D399' : '#10B981', // modern emerald scan line instead of generic red
      shadowColor: colors.primary === '#F8FAFC' ? '#34D399' : '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
    },
    overlayTextContainer: {
      position: 'absolute',
      top: insets ? insets.top + verticalScale(24) : verticalScale(40),
      left: scale(20),
      right: scale(20),
      alignItems: 'center',
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
    toast: {
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: scale(20),
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(24),
      marginTop: verticalScale(24),
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    toastText: {
      color: colors.primary === '#F8FAFC' ? '#F4F4F5' : '#0F172A',
      fontSize: scaleFont(14),
      fontWeight: '600',
      textAlign: 'center',
    },
    controls: {
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(24),
      paddingBottom: insets ? insets.bottom + verticalScale(16) : verticalScale(24),
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 8,
    },
    scanBtn: {
      marginBottom: verticalScale(12),
    },
    checkoutBtn: {
      borderColor: colors.border,
    },
  });
