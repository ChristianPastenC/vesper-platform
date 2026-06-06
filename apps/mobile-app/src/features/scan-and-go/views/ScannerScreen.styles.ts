import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
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
      height: 220,
    },
    viewfinderFrame: {
      width: 220,
      height: 220,
      position: 'relative',
      backgroundColor: 'transparent',
    },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
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
      left: 12,
      right: 12,
      top: 110,
      height: 2,
      backgroundColor: '#FF3B30', // Neon red for laser line
      shadowColor: '#FF3B30',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    overlayTextContainer: {
      position: 'absolute',
      top: 32,
      left: 16,
      right: 16,
      alignItems: 'center',
    },
    scanHint: {
      color: '#FFFFFF',
      fontSize: 15,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    toast: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginTop: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    toastText: {
      color: colors.text,
      fontSize: 14,
      textAlign: 'center',
    },
    controls: {
      padding: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    scanBtn: {
      marginBottom: 12,
    },
    checkoutBtn: {
      borderColor: colors.primary,
    },
  });
