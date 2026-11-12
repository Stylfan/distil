import type { Outline } from "./outline";
import { firstSentence, guessIcon, type Icon, type Story } from "./story";

/**
 * The story a deck tells when Distil has not written one: made from the
 * outline alone, by rule, so every presentation has a headline, key
 * messages and pictures from the first moment. Editing any of it on a
 * slide turns it into the outline's own story (deck-edit), from this
 * same starting point.
 */
export function storyFromOutline(outline: Outline): Story {
  const themes = outline.themes.filter((t) => t.title.trim());
  return {
    headline: firstSentence(outline.summary),
    tagline: "",
    soWhat: "",
    keyMessages: themes.slice(0, 3).map((t, i) => ({
      icon: guessIcon(t.title, i),
      title: t.title.trim(),
      text: firstSentence(t.summary) || t.points[0]?.trim() || "",
    })),
    themes: [],
    shifts: [],
    quoteNoteId: null,
    closing: "",
  };
}

/** The story to build from: the outline's own, or the one made by rule. */
export function storyOf(outline: Outline): Story {
  return outline.story ?? storyFromOutline(outline);
}

/** How one theme is told: its line in the story, or its own words and a guessed icon. */
export function themeTelling(
  story: Story,
  theme: { id: string; title: string },
  index: number,
): { headline: string; icon: Icon; soWhat: string; told: boolean } {
  const told = story.themes.find((t) => t.themeId === theme.id);
  if (told && told.headline) return { ...told, told: true };
  return {
    headline: "",
    icon: told?.icon ?? guessIcon(theme.title, index),
    soWhat: told?.soWhat ?? "",
    told: false,
  };
}
