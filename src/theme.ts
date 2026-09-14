import { Platform } from "react-native";

export const font = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
}) as string;

/** 4px base spacing rhythm */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const colors = {
  bg: "#0a1018",
  surface: "#0f1623",
  surfaceRaised: "#141c2b",
  surface2: "#141c2b",
  border: "#243044",
  borderSubtle: "#1a2436",
  text: "#eef2f7",
  muted: "#9aa8bc",
  faint: "#78899f",
  accent: "#7dd3fc",
  accentStrong: "#38bdf8",
  accentSolid: "#0ea5e9",
  accentSolidPressed: "#0284c7",
  accentMuted: "rgba(14, 165, 233, 0.12)",
  onPrimary: "#0a1018",
  danger: "#f87171",
  dangerBg: "#7f1d1d",
  white: "#ffffff",
  overlay: "rgba(0, 0, 0, 0.65)",
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
};

export const layout = {
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
};

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  padding: space.lg,
};

export const type = {
  pageTitle: {
    fontFamily: font,
    fontSize: 28,
    fontWeight: "600" as const,
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  sectionTitle: {
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.faint,
    marginBottom: space.sm,
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    lineHeight: 22,
  },
  body: {
    fontFamily: font,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    fontWeight: "400" as const,
  },
  caption: {
    fontFamily: font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.faint,
    fontWeight: "400" as const,
  },
  label: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.muted,
    lineHeight: 20,
  },
  statValue: {
    fontFamily: font,
    fontSize: 32,
    fontWeight: "600" as const,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  statValueSm: {
    fontFamily: font,
    fontSize: 20,
    fontWeight: "600" as const,
    color: colors.text,
    letterSpacing: -0.2,
  },
  button: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
};

export const input = {
  backgroundColor: colors.surfaceRaised,
  borderRadius: radius.sm,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontFamily: font,
  fontSize: 16,
  lineHeight: 22,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
};

export const button = {
  base: {
    borderRadius: radius.md,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 8,
  },
  primary: {
    backgroundColor: colors.accentSolid,
    borderWidth: 0,
  },
  primaryText: {
    ...type.button,
    color: colors.onPrimary,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    ...type.button,
    color: colors.text,
  },
  danger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerText: {
    ...type.button,
    color: colors.white,
  },
  dangerOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerOutlineText: {
    ...type.button,
    color: colors.danger,
  },
  iconPrimary: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSolid,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};

export const list = {
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    overflow: "hidden" as const,
  },
};
