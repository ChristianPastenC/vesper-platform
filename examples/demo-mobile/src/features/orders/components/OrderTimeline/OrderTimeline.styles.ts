import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface + 'E6',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border + 'CC',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    indicatorContainer: {
      alignItems: 'center',
      marginRight: 12,
      width: 20,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
      zIndex: 1,
    },
    line: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      position: 'absolute',
      top: 12,
      bottom: -20,
    },
    contentContainer: {
      flex: 1,
      paddingBottom: 4,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textTransform: 'capitalize',
    },
    descText: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.7,
      marginTop: 2,
    },
    timeText: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.5,
      marginTop: 2,
    },
  });
