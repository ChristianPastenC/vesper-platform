import { StyleSheet } from 'react-native';
import { scale, verticalScale } from '../../../../core/theme/responsive';

export const stylesFactory = () =>
  StyleSheet.create({
    footerContainer: {
      flexDirection: 'row',
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(16),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#E2E8F0', // Or derive from colors
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 10,
    },
    actionBtn: {
      flex: 1,
      height: verticalScale(52),
      borderRadius: scale(12),
    },
  });
