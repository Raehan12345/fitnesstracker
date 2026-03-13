/**
 * below are the colors that are used in the app. the colors are defined in the light and dark mode.
 * there are many other ways to style your app. for example, nativewind, tamagui, unistyles, etc.
 */

import { Platform } from 'react-native';

// sleek monochrome tint for a modern, high contrast look
const tintColorLight = '#000000';
const tintColorDark = '#ffffff';

export const Colors = {
  light: {
    text: '#09090b',
    textMuted: '#71717a',
    background: '#ffffff',
    surface: '#f4f4f5',
    border: '#e4e4e7',
    primary: '#18181b',
    tint: tintColorLight,
    icon: '#71717a',
    tabIconDefault: '#a1a1aa',
    tabIconSelected: tintColorLight,
    success: '#10b981',
    danger: '#ef4444',
  },
  dark: {
    text: '#fafafa',
    textMuted: '#a1a1aa',
    background: '#09090b',
    surface: '#18181b',
    border: '#27272a',
    primary: '#ffffff',
    tint: tintColorDark,
    icon: '#a1a1aa',
    tabIconDefault: '#52525b',
    tabIconSelected: tintColorDark,
    success: '#10b981',
    danger: '#ef4444',
  },
};

export const Fonts = Platform.select({
  ios: {
    // ios uifontdescriptorsystemdesigndefault
    sans: 'system-ui',
    // ios uifontdescriptorsystemdesignserif
    serif: 'ui-serif',
    // ios uifontdescriptorsystemdesignrounded
    rounded: 'ui-rounded',
    // ios uifontdescriptorsystemdesignmonospaced
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