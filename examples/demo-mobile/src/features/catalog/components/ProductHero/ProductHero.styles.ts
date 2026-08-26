import { StyleSheet, Dimensions } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

const { width } = Dimensions.get('window');

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    heroContainer: {
      backgroundColor: colors.surface,
      marginBottom: verticalScale(16),
      // We removed border bottom so it flows seamlessly into the overlapping content
    },
    imageContainer: {
      width: width,
      height: width, // Square aspect ratio edge-to-edge
      backgroundColor: colors.primary === '#F8FAFC' ? '#F1F5F9' : '#18181B',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      position: 'relative',
    },
    skeletonOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    skeletonIcon: {
      opacity: 0.2,
    },
    gradientOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.2)', // Simple overlay for premium contrast
      zIndex: 2,
    },
    contentOverlay: {
      position: 'absolute',
      bottom: verticalScale(56), // Above the overlapping specs
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      zIndex: 3,
    },
    title: {
      fontSize: scaleFont(32),
      fontWeight: '800',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      marginBottom: verticalScale(8),
    },
    price: {
      fontSize: scaleFont(24),
      fontWeight: '700',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    barcodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(8),
      borderRadius: scale(6),
      marginTop: verticalScale(12),
    },
    barcodeText: {
      fontSize: scaleFont(12),
      marginLeft: scale(6),
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
