import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';
import { scale, verticalScale, scaleFont } from '../../../../core/theme/responsive';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    glassContainer: {
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(24, 24, 27, 0.75)' : 'rgba(255, 255, 255, 0.95)',
      borderRadius: scale(24),
      padding: scale(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    section: {
      marginBottom: verticalScale(24),
    },
    sectionTitle: {
      fontSize: scaleFont(18),
      marginBottom: verticalScale(12),
      color: colors.primary === '#F8FAFC' ? '#FFFFFF' : '#000000',
    },
    descriptionText: {
      fontSize: scaleFont(15),
      lineHeight: verticalScale(24),
      color: colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
    },
    specsTable: {
      borderRadius: scale(12),
      backgroundColor:
        colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      overflow: 'hidden',
    },
    specRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor:
        colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    specRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
    },
    specLabel: {
      fontSize: scaleFont(15),
      color: colors.primary === '#F8FAFC' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
    },
    specValue: {
      fontSize: scaleFont(15),
      color: colors.primary === '#F8FAFC' ? '#FFFFFF' : '#000000',
      fontWeight: '500',
    },
  });
