import type { Outline } from "./outline";

/**
 * Where a word on a slide comes from, so a change made on the slide goes
 * back to the outline the deck is built from. The deck stays a pure view
 * of the outline: editing a slide is editing the outline.
 *
 * Emptying a point, a list item or an agreement removes it; emptying a
 * heading is ignored, because a theme without a name would vanish from
 * the deck with all its notes.
 */
export type DeckRef =
  | { kind: "workshopTitle" }
  | { kind: "summary" }
  | { kind: "themeTitle"; themeId: string }
  | { kind: "themeSummary"; themeId: string }
  | { kind: "point"; themeId: string; index: number }
  | { kind: "item"; list: "patterns" | "recommendations" | "openPoints"; id: string }
  | { kind: "action"; id: string; field: "what" | "who" | "when" };

export function applyDeckEdit(outline: Outline, ref: DeckRef, value: string): Outline {
  const text = value.replace(/\s+/g, " ").trim();
  switch (ref.kind) {
    case "workshopTitle":
      return outline;
    case "summary":
      return { ...outline, summary: value.trim() };
    case "themeTitle":
      if (!text) return outline;
      return {
        ...outline,
        themes: outline.themes.map((t) => (t.id === ref.themeId ? { ...t, title: text } : t)),
      };
    case "themeSummary":
      return {
        ...outline,
        themes: outline.themes.map((t) =>
          t.id === ref.themeId ? { ...t, summary: value.trim() } : t,
        ),
      };
    case "point":
      return {
        ...outline,
        themes: outline.themes.map((t) => {
          if (t.id !== ref.themeId) return t;
          const points = [...t.points];
          if (text) points[ref.index] = text;
          else points.splice(ref.index, 1);
          return { ...t, points };
        }),
      };
    case "item": {
      const update = <T extends { id: string; text: string }>(items: T[]): T[] =>
        text
          ? items.map((i) => (i.id === ref.id ? { ...i, text } : i))
          : items.filter((i) => i.id !== ref.id);
      if (ref.list === "patterns") return { ...outline, patterns: update(outline.patterns) };
      if (ref.list === "recommendations") {
        return { ...outline, recommendations: update(outline.recommendations) };
      }
      return { ...outline, openPoints: update(outline.openPoints) };
    }
    case "action":
      if (ref.field === "what" && !text) {
        return { ...outline, actions: outline.actions.filter((a) => a.id !== ref.id) };
      }
      return {
        ...outline,
        actions: outline.actions.map((a) => (a.id === ref.id ? { ...a, [ref.field]: text } : a)),
      };
  }
}
