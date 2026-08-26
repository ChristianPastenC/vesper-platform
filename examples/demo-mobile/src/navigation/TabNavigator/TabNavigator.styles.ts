import { ViewStyle } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors, insets?: EdgeInsets) => {
  const bottomInset = insets ? insets.bottom : 0;
  const tabBarStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 60 + bottomInset,
    paddingBottom: 8 + bottomInset,
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
