import type { NoteColour } from "@/db/schema";

/**
 * The presentation's look in PowerPoint: the same neutral palette as the
 * HTML deck, hex without "#" as PowerPoint wants it, and a font every
 * computer has, so the file looks the same wherever it is opened.
 */
export const FONT = "Arial";

export const COLOURS = {
  ink: "1F2D33",
  slate: "5C6A6F",
  hairline: "DAD6CF",
  bronze: "A88E6E",
  bronzeDeep: "7D6748",
  sand: "EFEAE4",
  white: "FFFFFF",
  note: "F8EEDB",
  noteEdge: "D9B866",
};

export const NOTE_FILL: Record<NoteColour, string> = {
  yellow: "F8EEDB",
  orange: "F9E3CF",
  pink: "F6E3E8",
  red: "F6E3E0",
  green: "E6F0DF",
  blue: "E5EEF8",
  purple: "EFE9F5",
  white: "F1EFE8",
  none: "F1EFE8",
};

export const NOTE_EDGE: Record<NoteColour, string> = {
  yellow: "D9B866",
  orange: "D99A5B",
  pink: "D493A6",
  red: "C2766E",
  green: "8FB07C",
  blue: "7FA3CC",
  purple: "A68DC2",
  white: "DAD6CF",
  none: "DAD6CF",
};

/** The slide: 13.33 × 7.5 inches, PowerPoint's own 16:9. */
export const W = 13.333;
export const H = 7.5;
export const MARGIN = 0.7;
