import { StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets ? insets.top + verticalScale(10) : verticalScale(20),
      paddingBottom: insets ? insets.bottom + verticalScale(20) : verticalScale(20),
      paddingHorizontal: scale(16),
    },
    banner: {
      backgroundColor: '#F59E0B22',
      borderColor: '#F59E0B',
      borderWidth: 1,
      borderRadius: scale(12),
      padding: scale(12),
      marginBottom: verticalScale(20),
    },
    bannerText: {
      fontSize: scaleFont(12),
      color: '#F59E0B',
      fontWeight: '600',
    },
    section: {
      marginBottom: verticalScale(24),
    },
    sectionTitle: {
      fontSize: scaleFont(14),
      fontWeight: 'bold',
      color: colors.text + '99',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: verticalScale(12),
      marginLeft: scale(8),
    },
    card: {
      backgroundColor: colors.surface + 'E6',
      borderRadius: scale(20),
      borderWidth: 1,
      borderColor: colors.border + '80',
      padding: scale(16),
      gap: verticalScale(12),
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: scaleFont(14),
      color: colors.text + '99',
    },
    statusValue: {
      fontSize: scaleFont(14),
      fontWeight: '700',
      color: colors.text,
    },
    statusValueDanger: {
      color: '#EF4444',
    },
    statusValueOk: {
      color: '#10B981',
    },
    button: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(8),
      borderRadius: scale(14),
      paddingVertical: verticalScale(14),
      marginTop: verticalScale(4),
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDanger: {
      backgroundColor: '#EF4444',
    },
    buttonText: {
      fontSize: scaleFont(15),
      fontWeight: '700',
      color: '#FFFFFF',
    },
    buttonTextSecondary: {
      color: colors.text,
    },
    resultText: {
      fontSize: scaleFont(13),
      color: colors.text + 'CC',
      marginTop: verticalScale(4),
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: scale(10),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(10),
      fontSize: scaleFont(14),
      color: colors.text,
    },
  });
