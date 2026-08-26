import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useTheme } from '../core/theme/useTheme';
import { stylesFactory } from './Text.styles';

export interface CustomTextProps extends TextProps {
  variant?: 'body' | 'title' | 'subtitle' | 'caption' | 'bold';
  children: React.ReactNode;
}

export const Text: React.FC<CustomTextProps> = ({
  variant = 'body',
  style,
  children,
  ...props
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const variantStyle = styles[variant] || styles.body;

  return (
    <RNText style={[variantStyle, style]} {...props}>
      {children}
    </RNText>
  );
};
