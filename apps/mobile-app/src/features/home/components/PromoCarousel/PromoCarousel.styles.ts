import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    heroBanner: {
      borderRadius: scale(16),
      padding: scale(16),
      marginBottom: verticalScale(16),
      marginHorizontal: scale(16), // ensure it has side margins in home
      backgroundColor: colors.primary === '#F8FAFC' ? '#18181B' : '#0F172A',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 4,
    },
    heroMicroCapsule: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      paddingHorizontal: scale(10),
      paddingVertical: scale(3),
      borderRadius: scale(12),
      alignSelf: 'flex-start',
      marginBottom: verticalScale(8),
    },
    heroMicroText: {
      color: '#FFFFFF',
      fontSize: scaleFont(10),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: scaleFont(18),
      lineHeight: verticalScale(24),
      fontWeight: '700',
      marginBottom: verticalScale(6),
    },
    heroSubText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: scaleFont(13),
      lineHeight: verticalScale(18),
    },
  });
