import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING, ELEVATION } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'filled' | 'outlined';
}

export default function Card({ children, style, variant = 'elevated' }: CardProps) {
  return (
    <View style={[styles.base, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
});

const variantStyles = StyleSheet.create({
  elevated: {
    backgroundColor: COLORS.surface,
    ...ELEVATION.level1,
  },
  filled: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  outlined: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
});
