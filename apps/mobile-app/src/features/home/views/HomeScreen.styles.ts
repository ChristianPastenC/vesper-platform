import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    welcomeTitle: {
      fontSize: 24,
    },
    welcomeSubtitle: {
      color: colors.text + '99',
      marginTop: 2,
    },
    avatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
    },
    bannerTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      marginBottom: 6,
    },
    bannerText: {
      color: '#FFFFFFEE',
      lineHeight: 18,
    },
    sectionTitle: {
      fontSize: 18,
      marginBottom: 16,
    },
    actionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    actionCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
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
      fontSize: 15,
      marginBottom: 4,
    },
    actionDesc: {
      color: colors.text + '80',
    },
    networkWidget: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    networkHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    networkTitle: {
      marginLeft: 8,
      fontSize: 15,
    },
    networkDesc: {
      color: colors.text + '99',
      marginBottom: 12,
      lineHeight: 16,
    },
    networkBtn: {
      height: 40,
      borderRadius: 8,
    },
    headerCartButton: {
      marginRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    badgeContainer: {
      position: 'absolute',
      right: -6,
      top: -6,
      backgroundColor: colors.error,
      borderRadius: 9,
      width: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
  });
