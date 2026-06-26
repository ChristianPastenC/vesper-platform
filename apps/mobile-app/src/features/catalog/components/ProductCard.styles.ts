import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      padding: scale(12),
      marginHorizontal: scale(6),
      marginBottom: verticalScale(12),
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: scale(4) },
      shadowOpacity: 0.02,
      shadowRadius: scale(10),
      elevation: 2,
    },
    imagePlaceholder: {
      height: verticalScale(120),
      borderRadius: scale(16),
      backgroundColor: colors.primary === '#F8FAFC' ? '#27272A' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(12),
      overflow: 'hidden',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    quickAddBtn: {
      position: 'absolute',
      bottom: scale(8),
      right: scale(8),
      backgroundColor: colors.primary,
      width: scale(32),
      height: scale(32),
      borderRadius: scale(16),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    skeletonOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
    },
    skeletonContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skeletonIcon: {
      opacity: 0.3,
    },
    header: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      marginBottom: verticalScale(6),
    },
    name: {
      fontSize: scaleFont(14),
      lineHeight: scaleFont(18),
      fontWeight: '500',
      color: colors.text,
      marginBottom: verticalScale(6),
    },
    priceTag: {
      marginBottom: verticalScale(4),
    },
    price: {
      fontSize: scaleFont(15),
      fontWeight: '700',
      color: colors.text,
    },
    infoContainer: {
      marginBottom: verticalScale(2),
    },
    barcodeTag: {
      alignSelf: 'flex-start',
    },
    barcodeText: {
      fontSize: scaleFont(10),
      color: colors.text + '80',
    },
  });
