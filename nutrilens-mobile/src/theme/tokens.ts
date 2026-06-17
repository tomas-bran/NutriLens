/**
 * Design tokens — Colors
 *
 * Mapeo 1:1 de los tokens CSS de la aplicación web (src/tokens/colors.css)
 * para mantener consistencia estricta con el Design System (Pencil).
 */
export const colors = {
  // Base
  bg: '#fafbf7',
  surface: '#f1f5f0',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',

  // Ink ramp (slate)
  ink: {
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    700: '#334155',
    900: '#0f172a',
  },

  // Brand (green)
  primary: '#16a34a',
  primaryStrong: '#15803d',
  primarySoft: '#f0fdf4',
  primaryBorder: '#86efac',

  // Feedback
  success: '#16a34a',
  successStrong: '#10b981',
  successBg: '#d1fae5',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#ef4444',
  dangerBg: '#fee2e2',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  muted: '#94a3b8',

  // Accent
  accentLime: '#a3e635',

  // Risk
  risk: {
    low: '#15803d',
    lowBg: '#dcfce7',
    medium: '#b45309',
    mediumBg: '#fef3c7',
    high: '#b91c1c',
    highBg: '#fee2e2',
  },

  // Aptitud
  aptTrue: '#16a34a',
  aptFalse: '#ef4444',
};

export const typography = {
  fontFamily: {
    // Expo uses system fonts by default. To add custom fonts, they must be loaded.
    // For now, we rely on the system sans-serif.
    sans: 'System',
  },
  fontSize: {
    xs: 10,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 26,
    '4xl': 28,
  },
};
