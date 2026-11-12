import type { Outline } from "./outline";
import { storyOf, themeTelling } from "./deck-story";
import type { Story } from "./story";

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
  | { kind: "action"; id: string; field: "what" | "who" | "when" }
  | { kind: "story"; field: "headline" | "tagline" | "soWhat" | "closing" }
  | { kind: "keyMessage"; index: number; field: "title" | "text" }
  | { kind: "themeStory"; themeId: string; field: "headline" | "soWhat" }
  | { kind: "shift"; index: number; field: "from" | "to" }
  /** The quoted note: another note's id, or "" for no quote. */
  | { kind: "quote" };

/** A change to the story, starting from the one the deck was built from. */
function editStory(outline: Outline, ref: DeckRef, value: string): Outline {
  const text = value.slice(0, 300);
  const story: Story = storyOf(outline);
  switch (ref.kind) {
    case "story":
      if (ref.field === "headline" && !text) return outline;
      return { ...outline, story: { ...story, [ref.field]: text } };
    case "keyMessage": {
      const keyMessages = [...story.keyMessages];
      const message = keyMessages[ref.index];
      if (!message) return outline;
      if (ref.field === "title" && !text) keyMessages.splice(ref.index, 1);
      else keyMessages[ref.index] = { ...message, [ref.field]: text };
      return { ...outline, story: { ...story, keyMessages } };
    }
    case "themeStory": {
      const index = outline.themes.findIndex((t) => t.id === ref.themeId);
      if (index < 0) return outline;
      const told = themeTelling(story, outline.themes[index]!, index);
      const entry = {
        themeId: ref.themeId,
        headline: told.headline,
        icon: told.icon,
        soWhat: told.soWhat,
        [ref.field]: text,
      };
      const themes = story.themes.some((t) => t.themeId === ref.themeId)
        ? story.themes.map((t) => (t.themeId === ref.themeId ? entry : t))
        : [...story.themes, entry];
      return { ...outline, story: { ...story, themes } };
    }
    case "quote":
      return { ...outline, story: { ...story, quoteNoteId: value.trim() || null } };
    case "shift": {
      const shifts = [...story.shifts];
      const shift = shifts[ref.index];
      if (!shift) return outline;
      if (!text) shifts.splice(ref.index, 1);
      else shifts[ref.index] = { ...shift, [ref.field]: text };
      return { ...outline, story: { ...story, shifts } };
    }
    default:
      return outline;
  }
}

export function applyDeckEdit(outline: Outline, ref: DeckRef, value: string): Outline {
  const text = value.replace(/\s+/g, " ").trim();
  switch (ref.kind) {
    case "workshopTitle":
      return outline;
    case "story":
    case "keyMessage":
    case "themeStory":
    case "shift":
    case "quote":
      return editStory(outline, ref, text);
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
