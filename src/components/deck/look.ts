import type { Look } from "@/domain/story";

/**
 * The colour themes of a presentation, as CSS variables set once around
 * the deck. Neutral: no logo, no brand, only colour; the post-its keep the
 * colours of the real notes whatever the theme.
 */
type Palette = {
  brand: string;
  deep: string;
  accent: string;
  paper: string;
  ink: string;
  muted: string;
  soft: string;
  good: string;
  warn: string;
  /** Light covers and breakers, for the calm themes; the others are dark. */
  light?: boolean;
};

export const PALETTES: Record<Look, Palette> = {
  kobolt: {
    brand: "#1747D6",
    deep: "#0B1F5C",
    accent: "#7FA6FF",
    paper: "#F4F2EE",
    ink: "#13213D",
    muted: "#5B6478",
    soft: "#E4EAFA",
    good: "#2F8F5B",
    warn: "#D9822B",
  },
  aubergine: {
    brand: "#3D1347",
    deep: "#24092B",
    accent: "#B6D13A",
    paper: "#FFFFFF",
    ink: "#24092B",
    muted: "#6B5A70",
    soft: "#F2EDF4",
    good: "#6E9A12",
    warn: "#C8642A",
  },
  petrol: {
    brand: "#0E5563",
    deep: "#083640",
    accent: "#F2B705",
    paper: "#F7F5F0",
    ink: "#0B2E36",
    muted: "#56696D",
    soft: "#E2EEEE",
    good: "#2E8B57",
    warn: "#D4791E",
  },
  skov: {
    brand: "#2F5D46",
    deep: "#1B3A2B",
    accent: "#E8A75A",
    paper: "#F6F4EE",
    ink: "#1C2B24",
    muted: "#5E6B63",
    soft: "#E3ECE5",
    good: "#3F8A4F",
    warn: "#C9782A",
  },
  sand: {
    brand: "#1F2D33",
    deep: "#141E22",
    accent: "#C9A77C",
    paper: "#F7F6F3",
    ink: "#1F2D33",
    muted: "#5C6A6F",
    soft: "#EEEAE3",
    good: "#4F7A5A",
    warn: "#B8862F",
  },
  papir: {
    brand: "#2F3F44",
    deep: "#243236",
    accent: "#A88E6E",
    paper: "#F7F5F1",
    ink: "#2F3F44",
    muted: "#5C6A6F",
    soft: "#EFEAE4",
    good: "#4F7A5A",
    warn: "#B8862F",
    light: true,
  },
  dis: {
    brand: "#4F6166",
    deep: "#2F3F44",
    accent: "#9FAAAD",
    paper: "#F5F6F5",
    ink: "#2F3F44",
    muted: "#6E7B7F",
    soft: "#E1E6E7",
    good: "#4F7A5A",
    warn: "#B8862F",
    light: true,
  },
  ler: {
    brand: "#7A6448",
    deep: "#4E4030",
    accent: "#C9B08E",
    paper: "#F6F1EA",
    ink: "#3A3128",
    muted: "#6F6556",
    soft: "#ECE3D6",
    good: "#5E7A4F",
    warn: "#B8862F",
    light: true,
  },
  grafit: {
    brand: "#1A1A1A",
    deep: "#000000",
    accent: "#B5B5B5",
    paper: "#FFFFFF",
    ink: "#111111",
    muted: "#5F5F5F",
    soft: "#EFEFEF",
    good: "#3D6B4E",
    warn: "#9A6B25",
  },
  mos: {
    brand: "#4A5D3A",
    deep: "#2C3A22",
    accent: "#C9B37E",
    paper: "#F4F1E8",
    ink: "#26301E",
    muted: "#5F6656",
    soft: "#E3E6D5",
    good: "#4E7D3F",
    warn: "#B57A2A",
  },
  lenskjold: {
    brand: "#2F3F44",
    deep: "#2F3F44",
    accent: "#A88E6E",
    paper: "#F7F5F1",
    ink: "#2F3F44",
    muted: "#5C6A6F",
    soft: "#EFEAE4",
    good: "#4F7A5A",
    warn: "#B8862F",
    light: true,
  },
};

/** The theme that carries the Lenskjold Consulting logo; every other theme is brand-free. */
export const BRANDED: Look = "lenskjold";
export const LOGO_SRC = "/brand/lenskjold-logo.png";

export function lookStyle(look: Look): React.CSSProperties {
  const p = PALETTES[look];
  return Object.fromEntries(
    Object.entries(p)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [`--deck-${k}`, v]),
  ) as React.CSSProperties;
}

/** A colour of the deck's theme, for a style. */
export const c = (name: Exclude<keyof Palette, "light">) => `var(--deck-${name})`;
