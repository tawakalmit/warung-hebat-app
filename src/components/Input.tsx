import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, Animated } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  supportingText?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  supportingText,
  containerStyle,
  rightIcon,
  leftIcon,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, focused && styles.labelFocused, error && styles.labelError]}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        focused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? { paddingLeft: 0 } : undefined]}
          placeholderTextColor={COLORS.placeholder}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {(error || supportingText) && (
        <Text style={[styles.supporting, error && styles.supportingError]}>
          {error || supportingText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs + 2,
    letterSpacing: 0.4,
  },
  labelFocused: {
    color: COLORS.primary,
  },
  labelError: {
    color: COLORS.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md - 4,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    letterSpacing: 0.25,
  },
  leftIcon: {
    paddingLeft: SPACING.md,
    marginRight: SPACING.sm,
  },
  rightIcon: {
    paddingRight: SPACING.md,
  },
  supporting: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.4,
  },
  supportingError: {
    color: COLORS.danger,
  },
});
