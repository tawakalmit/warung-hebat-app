import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'filled',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    variantStyles[variant],
    sizeStyles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStylesFinal = [
    styles.text,
    variantTextStyles[variant],
    sizeTextStyles[size],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outlined' || variant === 'text' ? COLORS.primary : COLORS.textWhite}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={textStylesFinal}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  text: {
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  disabled: {
    opacity: 0.38,
  },
});

const variantStyles = StyleSheet.create({
  filled: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
  },
  tonal: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: BORDER_RADIUS.xl,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: BORDER_RADIUS.xl,
  },
  text: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.xl,
  },
  danger: {
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.xl,
  },
});

const variantTextStyles = StyleSheet.create({
  filled: {
    color: COLORS.textWhite,
  },
  tonal: {
    color: COLORS.onPrimaryContainer,
  },
  outlined: {
    color: COLORS.primary,
  },
  text: {
    color: COLORS.primary,
  },
  danger: {
    color: COLORS.textWhite,
  },
});

const sizeStyles = StyleSheet.create({
  small: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 32,
  },
  medium: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    minHeight: 40,
  },
  large: {
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
  },
});

const sizeTextStyles = StyleSheet.create({
  small: {
    fontSize: 12,
  },
  medium: {
    fontSize: 14,
  },
  large: {
    fontSize: 15,
  },
});
