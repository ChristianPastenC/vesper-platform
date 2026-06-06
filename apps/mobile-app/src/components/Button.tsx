import React from 'react';
import { TouchableOpacity, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../core/theme/useTheme';
import { Text } from './Text';
import { stylesFactory } from './Button.styles';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  status?: 'idle' | 'loading' | 'disabled';
  variant?: 'primary' | 'secondary' | 'danger';
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  status = 'idle',
  variant = 'primary',
  style,
  disabled,
  leftIcon,
  ...props
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const isButtonDisabled =
    disabled || status === 'disabled' || status === 'loading';
  const buttonStyle = [
    styles.button,
    styles[variant],
    isButtonDisabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {status === 'loading' ? (
        <ActivityIndicator
          color={variant === 'secondary' ? theme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <Text
            variant="bold"
            style={[
              styles.text,
              variant === 'secondary' && styles.textSecondary,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
