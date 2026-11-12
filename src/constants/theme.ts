// Material Design 3 (Google Material You) inspired theme
export const COLORS = {
  // Primary - Google Blue
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#4285F4',
  primaryContainer: '#D3E3FD',
  onPrimaryContainer: '#041E49',

  // Secondary - Google Teal
  secondary: '#00897B',
  secondaryLight: '#4DB6AC',
  secondaryContainer: '#B2DFDB',

  // Tertiary
  tertiary: '#7C4DFF',
  tertiaryContainer: '#E8DEF8',

  // Accent colors
  accent: '#EA4335', // Google Red

  // Status
  success: '#34A853', // Google Green
  warning: '#FBBC04', // Google Yellow
  danger: '#EA4335', // Google Red
  info: '#4285F4', // Google Blue

  // Surfaces (Material You)
  background: '#F8FAFE',
  surface: '#FFFFFF',
  surfaceVariant: '#E8EDF5',
  surfaceContainer: '#F0F4FA',
  surfaceContainerHigh: '#E8EDF5',
  surfaceContainerLow: '#F8FAFE',

  // Text
  text: '#1F1F1F',
  textSecondary: '#5F6368',
  textTertiary: '#80868B',
  textLight: '#AEAEAE',
  textWhite: '#FFFFFF',
  onSurface: '#1F1F1F',
  onSurfaceVariant: '#444746',

  // Borders & Dividers
  border: '#DADCE0',
  divider: '#E8EAED',
  outline: '#747775',
  outlineVariant: '#C4C7C5',

  // States
  disabled: '#AEAEAE',
  placeholder: '#9AA0A6',
  ripple: 'rgba(26, 115, 232, 0.08)',
  scrim: 'rgba(0, 0, 0, 0.32)',
};

export const FONTS = {
  // Google Sans / Product Sans inspired
  displayLarge: { fontSize: 28, fontWeight: '400' as const, color: COLORS.text, letterSpacing: -0.5 },
  displayMedium: { fontSize: 24, fontWeight: '400' as const, color: COLORS.text },
  headlineLarge: { fontSize: 22, fontWeight: '400' as const, color: COLORS.text },
  headlineMedium: { fontSize: 20, fontWeight: '500' as const, color: COLORS.text },
  titleLarge: { fontSize: 18, fontWeight: '500' as const, color: COLORS.text },
  titleMedium: { fontSize: 16, fontWeight: '500' as const, color: COLORS.text, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, fontWeight: '500' as const, color: COLORS.text, letterSpacing: 0.1 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, color: COLORS.text, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, color: COLORS.text, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, color: COLORS.textSecondary, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, fontWeight: '500' as const, color: COLORS.text, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, fontWeight: '500' as const, color: COLORS.textSecondary, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, fontWeight: '500' as const, color: COLORS.textSecondary, letterSpacing: 0.5 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 100,
};

// Material Design 3 elevation
export const ELEVATION = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};
