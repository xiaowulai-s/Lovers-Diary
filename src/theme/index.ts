import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  canvas: '#FBF7F1',
  canvasDeep: '#F3ECE2',
  surface: '#FFFDFA',
  surfaceAlt: '#F7F0E7',
  ink: '#2C2723',
  inkSoft: '#6E6258',
  inkMuted: '#A19386',
  accent: '#B05E55',
  accentDeep: '#8E473F',
  accentSoft: '#F2DED7',
  sage: '#7C8A72',
  sageSoft: '#E3E8DD',
  gold: '#B98C55',
  goldSoft: '#F0E4D2',
  line: '#E9DFD3',
  lineStrong: '#D8C9BA',
  white: '#FFFFFF',
  danger: '#A44A42',
  dangerSoft: '#F7E4E0',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const fonts = {
  display: Platform.select({ android: 'serif', ios: 'Songti SC', default: 'serif' }),
  body: Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' }),
  medium: Platform.select({ android: 'sans-serif-medium', ios: 'System', default: 'System' }),
} as const;

export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  lifted: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
} satisfies Record<string, ViewStyle>;

export const text = {
  kicker: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
    color: colors.accent,
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 44,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  section: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 23,
    color: colors.inkSoft,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  numeral: {
    fontFamily: fonts.display,
    fontSize: 68,
    lineHeight: 76,
    letterSpacing: -1.5,
    color: colors.accentDeep,
  },
} satisfies Record<string, TextStyle>;
