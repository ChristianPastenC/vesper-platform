import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, _insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
    },
    permissionContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: scale(100),
    },
    permissionText: {
      color: 'white',
      marginBottom: 16,
      fontSize: scaleFont(16),
      textAlign: 'center',
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
      top: 0,
      height: 2,
      backgroundColor: colors.primary === '#F8FAFC' ? '#34D399' : '#10B981',
      shadowColor: colors.primary === '#F8FAFC' ? '#34D399' : '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
    },
  });
