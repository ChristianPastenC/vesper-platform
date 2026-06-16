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
      height: verticalScale(110),
      borderRadius: scale(16),
      backgroundColor: colors.primary === '#F8FAFC' ? '#27272A' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(10),
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
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
      backgroundColor: colors.primary === '#F8FAFC' ? '#FFFFFF1A' : '#0F172A0A',
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(2),
      borderRadius: scale(12),
      alignSelf: 'flex-start',
      marginBottom: verticalScale(6),
    },
    price: {
      fontSize: scaleFont(13),
      fontWeight: '700',
      color: colors.primary,
    },
    infoContainer: {
      marginBottom: verticalScale(12),
    },
    barcodeTag: {
      backgroundColor: colors.primary === '#F8FAFC' ? '#FFFFFF0D' : '#0F172A05',
      paddingHorizontal: scale(6),
      paddingVertical: verticalScale(2),
      borderRadius: scale(6),
      alignSelf: 'flex-start',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    barcodeText: {
      fontSize: scaleFont(10),
      color: colors.text + '80',
    },
    actions: {
      flexDirection: 'column',
      width: '100%',
    },
    actionBtn: {
      width: '100%',
      height: verticalScale(38),
      borderRadius: scale(10),
      paddingHorizontal: scale(8),
    },
    spacing: {
      height: verticalScale(8),
    },
  });
