import React from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../core/theme/useTheme';
import { stylesFactory } from './SearchBar.styles';

export interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const SearchBar = React.forwardRef<TextInput, SearchBarProps>(({
  value,
  onChangeText,
  placeholder,
  editable = true,
  onPress,
  rightElement,
  containerStyle,
  ...props
}, ref) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const innerContent = (
    <>
      <Ionicons
        name="search-outline"
        size={18}
        color={theme.colors.textSecondary || theme.colors.text + '80'}
        style={styles.searchIcon}
      />
      <TextInput
        ref={ref}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary || theme.colors.text + '70'}
        editable={editable}
        pointerEvents={editable ? 'auto' : 'none'}
        {...props}
      />
      {rightElement && (
        <>
          <View style={styles.searchSeparator} />
          {rightElement}
        </>
      )}
    </>
  );

  if (!editable && onPress) {
    return (
      <TouchableOpacity 
        style={[styles.searchBarContainer, containerStyle]} 
        activeOpacity={0.7} 
        onPress={onPress}
        testID="search-bar-touchable"
      >
        {innerContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.searchBarContainer, containerStyle]} testID="search-bar-container">
      {innerContent}
    </View>
  );
});
