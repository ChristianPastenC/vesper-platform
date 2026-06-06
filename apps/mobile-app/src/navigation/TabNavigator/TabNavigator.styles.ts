import { ViewStyle } from 'react-native';
import { ThemeColors } from '../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) => {
  const tabBarStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  };

  const headerStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  };

  return {
    tabBarStyle,
    headerStyle,
    activeTintColor: colors.primary,
    inactiveTintColor: colors.text + '80', // 50% opacity
    headerTintColor: colors.text,
  };
};
