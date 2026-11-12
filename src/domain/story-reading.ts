import type { Outline } from "./outline";
import { ICONS, guessIcon, storySchema, type Icon, type Story } from "./story";

/**
 * Between the outline and the model, both ways, for the story of the
 * presentation. What goes out is the approved outline with its themes by
 * id, and the notes that could be quoted as numbered lines; what comes
 * back is untrusted, parsed leniently: unknown themes and notes are
 * dropped, an unknown icon is replaced by one guessed from the words, and
 * a quote must point at a real note, so it is always the note's own words.
 */

type Raw = Record<string, unknown>;
const record = (v: unknown): Raw | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Raw) : null;
const items = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown, max = 300) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const isIcon = (v: unknown): v is Icon => typeof v === "string" && ICONS.includes(v as Icon);
const iconOr = (v: unknown, words: string, index: number): Icon =>
  isIcon(v) ? v : guessIcon(words, index);

/** The outline as the model sees it for the story: no note ids, no questions. */
export function outlineForStory(outline: Outline): string {
  const parts = [
    `Summary: ${outline.summary}`,
    "Themes:",
    ...outline.themes.map(
      (t) =>
        `- id ${t.id}: ${t.title} (${t.noteIds.length} notes). ${t.summary}\n${t.points
          .map((p) => `    · ${p}`)
          .join("\n")}`,
    ),
    "Patterns:",
    ...outline.patterns.map((p) => `- ${p.text}`),
    "Recommendations the facilitator kept:",
    ...outline.recommendations.filter((r) => r.kept).map((r) => `- ${r.text}`),
    "Agreed:",
    ...outline.actions.map((a) => `- ${a.what}${a.who ? ` (${a.who})` : ""}`),
    "Open:",
    ...outline.openPoints.map((o) => `- ${o.text}`),
  ];
  return parts.join("\n");
}

export function parseStory(
  raw: unknown,
  outline: Outline,
  toId: Map<string, string>,
): Story | null {
  const o = record(raw);
  if (!o) return null;
  const themes = new Map(outline.themes.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const story: Story = {
    headline: text(o.headline),
    tagline: text(o.tagline),
    soWhat: text(o.soWhat),
    keyMessages: items(o.keyMessages)
      .map(record)
      .filter((m): m is Raw => !!m && !!text(m.title))
      .slice(0, 4)
      .map((m, i) => ({
        icon: iconOr(m.icon, `${text(m.title)} ${text(m.text)}`, i),
        title: text(m.title),
        text: text(m.text),
      })),
    themes: items(o.themes)
      .map(record)
      .filter((t): t is Raw => !!t && themes.has(text(t.themeId, 40)))
      .filter((t) => {
        const id = text(t.themeId, 40);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((t, i) => {
        const id = text(t.themeId, 40);
        return {
          themeId: id,
          headline: text(t.headline),
          icon: iconOr(t.icon, themes.get(id)!.title, i),
          soWhat: text(t.soWhat),
        };
      }),
    shifts: items(o.shifts)
      .map(record)
      .filter((s): s is Raw => !!s && !!text(s.from) && !!text(s.to))
      .slice(0, 5)
      .map((s) => ({ from: text(s.from), to: text(s.to) })),
    quoteNoteId: toId.get(text(o.quote, 20)) ?? null,
    closing: text(o.closing),
  };
  if (!story.headline) return null;
  const checked = storySchema.safeParse(story);
  return checked.success ? checked.data : null;
}
