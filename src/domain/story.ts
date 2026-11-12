import { z } from "zod";

/**
 * The story of a presentation: what turns an outline into slides a client
 * can be shown. A headline that says what the workshop came to (an
 * "action title", not a topic), three key messages, one sharp line per
 * theme, a "so what", the shifts the room asked for, one note quoted word
 * for word, and a closing line. Distil writes it from the approved
 * outline; the facilitator changes any word of it on the slides.
 *
 * It is part of the outline document, so it is saved, versioned, exported
 * and deleted with it. Without one, the deck is built from the outline
 * alone (`storyFromOutline`), so a presentation never waits for the model.
 */

/** The icons a story may use; each has a drawing in the app (components/deck/icons). */
export const ICONS = [
  "users",
  "user-check",
  "handshake",
  "message-circle",
  "megaphone",
  "target",
  "compass",
  "map",
  "flag",
  "rocket",
  "trending-up",
  "chart",
  "gauge",
  "clock",
  "calendar",
  "layers",
  "layout",
  "puzzle",
  "settings",
  "wrench",
  "shield",
  "scale",
  "lightbulb",
  "sparkles",
  "heart",
  "graduation",
  "book",
  "search",
  "eye",
  "alert",
  "check",
  "refresh",
  "workflow",
  "database",
  "monitor",
  "coins",
  "leaf",
  "building",
  "globe",
  "star",
] as const;
export type Icon = (typeof ICONS)[number];

/**
 * The colour themes a presentation can wear. All neutral (only colour and
 * shape) except "lenskjold", which carries the Lenskjold Consulting logo and
 * is only ever chosen by the facilitator.
 */
export const LOOKS = [
  "kobolt",
  "aubergine",
  "petrol",
  "skov",
  "sand",
  "papir",
  "dis",
  "ler",
  "grafit",
  "mos",
  "lenskjold",
] as const;
export type Look = (typeof LOOKS)[number];
export const DEFAULT_LOOK: Look = "kobolt";

const line = z.string().trim().max(300);
const icon = z.enum(ICONS);

export const storySchema = z.object({
  /** The deck's main message, one sentence: what the workshop came to. */
  headline: line,
  /** Under the title on the cover: a short line on what the deck holds. */
  tagline: line,
  /** The consequence, one sentence: what must happen because of it. */
  soWhat: line,
  keyMessages: z.array(z.object({ icon, title: line, text: line })).max(4),
  themes: z
    .array(z.object({ themeId: z.string().min(1).max(40), headline: line, icon, soWhat: line }))
    .max(20),
  /** From how it is today to how the room wants it. */
  shifts: z.array(z.object({ from: line, to: line })).max(5),
  /** One note that says it best, quoted as written; null when none stands out. */
  quoteNoteId: z.string().min(1).max(64).nullable(),
  closing: line,
  /** Themes of the outline left out of the presentation (still in the outline). */
  hidden: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export type Story = z.infer<typeof storySchema>;
export type ThemeStory = Story["themes"][number];

const KEYWORDS: [RegExp, Icon][] = [
  [/rolle|ansvar|mandat|ejer|role|owner/i, "user-check"],
  [/team|samarbejd|kolleg|people|menneske|medarbejder|collab/i, "users"],
  [/kommunik|dialog|møde|meeting|feedback|snak/i, "message-circle"],
  [/strategi|retning|vision|mål|goal|direction/i, "compass"],
  [/governance|styring|beslut|decision|struktur|structure/i, "layers"],
  [/kalender|kadence|tid|time|deadline|plan/i, "calendar"],
  [/proces|flow|arbejdsgang|workflow|process/i, "workflow"],
  [/værktøj|tool|system|it\b|data|platform/i, "monitor"],
  [/kunde|customer|bruger|user/i, "heart"],
  [/kompetence|læring|lær|training|onboarding|uddann/i, "graduation"],
  [/risiko|risk|problem|udfordr|barriere/i, "alert"],
  [/virker|godt|styrke|success|works|fejr/i, "sparkles"],
  [/økonomi|budget|pris|cost|penge/i, "coins"],
  [/kvalitet|quality|test/i, "shield"],
  [/idé|idea|innov|ny\b|new/i, "lightbulb"],
  [/vækst|growth|resultat|result|måling|kpi/i, "trending-up"],
];
const FALLBACK: Icon[] = ["target", "layers", "users", "compass", "lightbulb", "workflow"];

/** An icon for a theme from its words, so a deck without a story still has pictures. */
export function guessIcon(text: string, index: number): Icon {
  for (const [pattern, icon] of KEYWORDS) if (pattern.test(text)) return icon;
  return FALLBACK[index % FALLBACK.length]!;
}

/** The first sentence of a text, for a headline made without the model. */
export function firstSentence(text: string): string {
  const t = text.trim();
  const end = t.search(/[.!?](\s|$)/);
  return (end > 0 ? t.slice(0, end + 1) : t).slice(0, 300);
}
