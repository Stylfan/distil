import type { NoteColour } from "@/db/schema";

/**
 * How a post-it's colour is drawn: a soft fill close to the real note and
 * a darker edge. These follow the notes on the wall, so they are the one
 * place where colour shows what something looked like rather than what it
 * means.
 */
export const NOTE_FILL: Record<NoteColour, string> = {
  yellow: "#F8EEDB",
  orange: "#F9E3CF",
  pink: "#F6E3E8",
  red: "#F6E3E0",
  green: "#E6F0DF",
  blue: "#E5EEF8",
  purple: "#EFE9F5",
  white: "#FFFFFF",
  none: "transparent",
};

export const NOTE_EDGE: Record<NoteColour, string> = {
  yellow: "#D9B866",
  orange: "#D99A5B",
  pink: "#D493A6",
  red: "#C2766E",
  green: "#8FB07C",
  blue: "#7FA3CC",
  purple: "#A68DC2",
  white: "#DAD6CF",
  none: "#DAD6CF",
};
