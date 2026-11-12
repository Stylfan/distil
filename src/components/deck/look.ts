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
};

export function lookStyle(look: Look): React.CSSProperties {
  const p = PALETTES[look];
  return Object.fromEntries(
    Object.entries(p).map(([k, v]) => [`--deck-${k}`, v]),
  ) as React.CSSProperties;
}

/** A colour of the deck's theme, for a style. */
export const c = (name: keyof Palette) => `var(--deck-${name})`;
