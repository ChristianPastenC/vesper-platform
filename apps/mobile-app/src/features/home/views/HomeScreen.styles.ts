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
    scrollContent: {
      paddingHorizontal: scale(20),
      paddingTop: insets ? insets.top + verticalScale(10) : verticalScale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(20) : verticalScale(20),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(24),
    },
    welcomeTitle: {
      fontSize: scaleFont(24),
    },
    welcomeSubtitle: {
      color: colors.text + '99',
      marginTop: verticalScale(2),
      fontSize: scaleFont(14),
    },
    avatarCircle: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(24),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerCard: {
      backgroundColor: colors.primary,
      borderRadius: scale(16),
      padding: scale(20),
      marginBottom: verticalScale(24),
    },
    bannerTitle: {
      color: '#FFFFFF',
      fontSize: scaleFont(18),
      marginBottom: verticalScale(6),
    },
    bannerText: {
      color: '#FFFFFFEE',
      lineHeight: verticalScale(18),
      fontSize: scaleFont(13),
    },
    sectionTitle: {
      fontSize: scaleFont(18),
      marginBottom: verticalScale(16),
    },
    actionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(16),
    },
    actionCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      padding: scale(16),
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(10),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    purpleBg: {
      backgroundColor: '#7C3AED',
    },
    blueBg: {
      backgroundColor: '#3B82F6',
    },
    greenBg: {
      backgroundColor: '#10B981',
    },
    orangeBg: {
      backgroundColor: '#F59E0B',
    },
    actionLabel: {
      fontSize: scaleFont(15),
      marginBottom: verticalScale(4),
    },
    actionDesc: {
      color: colors.text + '80',
      fontSize: scaleFont(12),
    },
    networkWidget: {
      backgroundColor: colors.surface,
      borderRadius: scale(16),
      padding: scale(16),
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: verticalScale(8),
    },
    networkHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    networkTitle: {
      marginLeft: scale(8),
      fontSize: scaleFont(15),
    },
    networkDesc: {
      color: colors.text + '99',
      marginBottom: verticalScale(12),
      lineHeight: verticalScale(16),
      fontSize: scaleFont(12),
    },
    networkBtn: {
      height: verticalScale(40),
      borderRadius: scale(8),
    },
    headerCartButton: {
      marginRight: scale(16),
      flexDirection: 'row',
      alignItems: 'center',
    },
    badgeContainer: {
      position: 'absolute',
      right: scale(-6),
      top: scale(-6),
      backgroundColor: colors.error,
      borderRadius: scale(9),
      width: scale(18),
      height: scale(18),
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: scaleFont(10),
      fontWeight: 'bold',
    },
  });
