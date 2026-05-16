import { Platform } from 'react-native';

/** Revolut-inspired dark palette */
export const R = {
  bg: '#0D0E12',
  bgCard: '#16191F',
  bgCardAlt: '#1E2128',
  border: '#272B34',
  accent: '#7B5EF8',
  accentDim: '#3D2FA0',
  blue: '#0075FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8B9E',
  textMuted: '#4A4A58',
  income: '#00C896',
  expense: '#FF3B5C',
  warning: '#FFB800',
  white: '#FFFFFF',
};

const tintColorLight = '#0a7ea4';
const tintColorDark = R.accent;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: R.textPrimary,
    background: R.bg,
    tint: tintColorDark,
    icon: R.textSecondary,
    tabIconDefault: R.textSecondary,
    tabIconSelected: R.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
