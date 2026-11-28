export type DesignThemeRadius = "sharp" | "balanced" | "soft";

export interface DesignThemeColors {
  primary: string;
  accent: string;
  canvas: string;
  surface: string;
  card: string;
  border: string;
  ink: string;
  muted: string;
}

export interface DesignThemeSettings {
  schemaVersion: 1;
  presetId: string;
  presetName: string;
  radius: DesignThemeRadius;
  colors: DesignThemeColors;
}

export const DESIGN_THEME_PRESETS: readonly DesignThemeSettings[] = [
  {
    schemaVersion: 1,
    presetId: "srikandi",
    presetName: "Srikandi Hijau Emas",
    radius: "balanced",
    colors: {
      primary: "#127e2f",
      accent: "#f0b429",
      canvas: "#f8fafe",
      surface: "#f1f4f9",
      card: "#ffffff",
      border: "#cbd4e2",
      ink: "#0f1a2b",
      muted: "#5c6a7d",
    },
  },
  {
    schemaVersion: 1,
    presetId: "forest-gold",
    presetName: "Forest & Gold",
    radius: "soft",
    colors: {
      primary: "#1f5a35",
      accent: "#d7a72f",
      canvas: "#f8f7f1",
      surface: "#eeede5",
      card: "#ffffff",
      border: "#d6d1c1",
      ink: "#222b24",
      muted: "#555c56",
    },
  },
  {
    schemaVersion: 1,
    presetId: "emerald-clean",
    presetName: "Emerald Clean",
    radius: "balanced",
    colors: {
      primary: "#087f5b",
      accent: "#e5a000",
      canvas: "#f7faf9",
      surface: "#edf4f1",
      card: "#ffffff",
      border: "#cbd8d2",
      ink: "#10231c",
      muted: "#52645c",
    },
  },
  {
    schemaVersion: 1,
    presetId: "blue-institutional",
    presetName: "Blue Institutional",
    radius: "sharp",
    colors: {
      primary: "#1d4ed8",
      accent: "#e3a008",
      canvas: "#f6f8fc",
      surface: "#eaf0f8",
      card: "#ffffff",
      border: "#cbd5e1",
      ink: "#101828",
      muted: "#475467",
    },
  },
  {
    schemaVersion: 1,
    presetId: "earth-modern",
    presetName: "Earth Modern",
    radius: "soft",
    colors: {
      primary: "#5b5d2a",
      accent: "#c17a24",
      canvas: "#faf8f3",
      surface: "#f0ece3",
      card: "#ffffff",
      border: "#d8d0c1",
      ink: "#29271f",
      muted: "#625d52",
    },
  },
] as const;

export const DEFAULT_DESIGN_THEME: DesignThemeSettings = DESIGN_THEME_PRESETS[0];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

export function createThemeFromPreset(presetId: string): DesignThemeSettings {
  const preset = DESIGN_THEME_PRESETS.find((item) => item.presetId === presetId);
  const source = preset ?? DEFAULT_DESIGN_THEME;
  return {
    ...source,
    colors: { ...source.colors },
  };
}

export function normalizeDesignTheme(value: unknown): DesignThemeSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sourceColors = source.colors && typeof source.colors === "object"
    ? source.colors as Record<string, unknown>
    : {};
  const presetId = typeof source.presetId === "string" ? source.presetId : DEFAULT_DESIGN_THEME.presetId;
  const preset = DESIGN_THEME_PRESETS.find((item) => item.presetId === presetId) ?? DEFAULT_DESIGN_THEME;
  const colors = { ...preset.colors };
  for (const key of Object.keys(colors) as Array<keyof DesignThemeColors>) {
    if (isHexColor(sourceColors[key])) colors[key] = (sourceColors[key] as string).toLowerCase();
  }
  const radius: DesignThemeRadius =
    source.radius === "sharp" || source.radius === "soft" ? source.radius : "balanced";

  return {
    schemaVersion: 1,
    presetId: preset.presetId,
    presetName: preset.presetName,
    radius,
    colors,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function mix(hex: string, target: string, weight: number): string {
  const from = hexToRgb(hex);
  const to = hexToRgb(target);
  const channels = from.map((channel, index) => channel + (to[index] - channel) * weight);
  return "#" + channels.map(channelToHex).join("");
}

function luminance(hex: string): number {
  const channels = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateDesignTheme(theme: DesignThemeSettings): string | null {
  const entries = Object.entries(theme.colors) as Array<[keyof DesignThemeColors, string]>;
  for (const [key, value] of entries) {
    if (!isHexColor(value)) return "Warna " + key + " harus menggunakan format HEX enam digit.";
  }
  if (contrastRatio("#ffffff", theme.colors.primary) < 4.5) {
    return "Warna utama terlalu terang untuk teks putih. Pilih warna utama dengan rasio kontras minimal 4,5:1.";
  }
  if (contrastRatio(theme.colors.ink, theme.colors.canvas) < 4.5) {
    return "Warna teks utama dan latar halaman belum memenuhi kontras 4,5:1.";
  }
  if (contrastRatio(theme.colors.ink, theme.colors.card) < 4.5) {
    return "Warna teks utama dan latar kartu belum memenuhi kontras 4,5:1.";
  }
  if (contrastRatio(theme.colors.muted, theme.colors.canvas) < 4.5) {
    return "Warna teks sekunder belum memenuhi kontras 4,5:1 pada latar halaman.";
  }
  if (contrastRatio(theme.colors.muted, theme.colors.card) < 4.5) {
    return "Warna teks sekunder belum memenuhi kontras 4,5:1 pada latar kartu.";
  }
  return null;
}

export function buildDesignThemeCssVariables(theme: DesignThemeSettings): Record<string, string> {
  const c = theme.colors;
  const radius = theme.radius === "sharp"
    ? { large: "10px", small: "6px" }
    : theme.radius === "soft"
      ? { large: "20px", small: "12px" }
      : { large: "16px", small: "10px" };

  return {
    "--sb-primary": c.primary,
    "--sb-primary-950": mix(c.primary, "#000000", 0.44),
    "--sb-primary-900": mix(c.primary, "#000000", 0.31),
    "--sb-primary-800": mix(c.primary, "#000000", 0.17),
    "--sb-primary-700": c.primary,
    "--sb-primary-600": mix(c.primary, "#ffffff", 0.16),
    "--sb-primary-500": mix(c.primary, "#ffffff", 0.28),
    "--sb-primary-400": mix(c.primary, "#ffffff", 0.42),
    "--sb-primary-300": mix(c.primary, "#ffffff", 0.58),
    "--sb-primary-200": mix(c.primary, "#ffffff", 0.74),
    "--sb-primary-100": mix(c.primary, "#ffffff", 0.88),
    "--sb-primary-50": mix(c.primary, "#ffffff", 0.95),
    "--sb-accent": c.accent,
    "--sb-accent-700": mix(c.accent, "#000000", 0.54),
    "--sb-accent-600": mix(c.accent, "#000000", 0.28),
    "--sb-accent-500": c.accent,
    "--sb-accent-100": mix(c.accent, "#ffffff", 0.82),
    "--sb-accent-50": mix(c.accent, "#ffffff", 0.93),
    "--sb-canvas": c.canvas,
    "--sb-paper": c.card,
    "--sb-card": c.card,
    "--sb-surface-2": c.surface,
    "--sb-border": mix(c.border, "#ffffff", 0.42),
    "--sb-border-strong": c.border,
    "--sb-ink": c.ink,
    "--sb-ink-2": mix(c.ink, c.muted, 0.42),
    "--sb-muted": c.muted,
    "--sb-muted-2": c.muted,
    "--sb-forest": mix(c.primary, "#000000", 0.24),
    "--sb-radius": radius.large,
    "--sb-radius-sm": radius.small,
  };
}
