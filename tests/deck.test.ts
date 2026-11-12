import { describe, expect, it } from "vitest";
import {
  ACTIONS_PER_SLIDE,
  NOTES_ON_THEME,
  NOTES_PER_TRANSCRIPT,
  POINTS_PER_SLIDE,
  buildDeck,
  type DeckNote,
} from "@/domain/deck";
import { detectLanguage } from "@/domain/deck-words";
import { EMPTY_OUTLINE, type Outline } from "@/domain/outline";
import { formatDay } from "@/lib/dates";

/**
 * The presentation is built from the outline and nothing else: the
 * overview first, a slide per theme with its notes, only the
 * recommendations the facilitator kept, long lists split rather than
 * shrunk, and the transcript only when asked for.
 */

const notes: DeckNote[] = Array.from({ length: 40 }, (_, i) => ({
  id: `n${i}`,
  text: `Seddel ${i}`,
  colour: i % 2 ? "yellow" : "pink",
  photo: i < 20 ? 1 : 2,
}));

const outline: Outline = {
  ...EMPTY_OUTLINE,
  summary: "Vi talte om onboarding.",
  themes: [
    {
      id: "t1",
      title: "Onboarding",
      summary: "Dag 1 er tung.",
      points: ["a", "b"],
      noteIds: ["n0", "n1", "nope"],
    },
    {
      id: "t2",
      title: "Værktøjer",
      summary: "",
      points: Array.from({ length: POINTS_PER_SLIDE + 2 }, (_, i) => `p${i}`),
      noteIds: notes.slice(0, NOTES_ON_THEME + 3).map((n) => n.id),
    },
    { id: "t3", title: "  ", summary: "", points: [], noteIds: [] },
  ],
  patterns: [{ id: "p1", text: "Det samme overalt" }],
  recommendations: [
    { id: "r1", text: "Beholdt", kept: true },
    { id: "r2", text: "Kun et forslag", kept: false },
  ],
  actions: Array.from({ length: ACTIONS_PER_SLIDE + 1 }, (_, i) => ({
    id: `a${i}`,
    what: `Gør ${i}`,
    who: i === 0 ? "Anna" : "",
    when: "",
    noteIds: [],
  })),
  openPoints: [
    { id: "o1", text: "Hvem ejer det?", noteIds: [] },
    { id: "o2", text: " ", noteIds: [] },
  ],
};

const deck = (includeTranscript = false) =>
  buildDeck({ title: "Workshop", date: "12. november 2026", outline, notes, includeTranscript });

describe("the presentation", () => {
  it("opens with a cover and the whole message on one slide, told by rule without a story", () => {
    const [cover, summary] = deck();
    expect(cover).toEqual({
      kind: "cover",
      title: "Workshop",
      date: "12. november 2026",
      tagline: "",
    });
    expect(summary).toMatchObject({
      kind: "summary",
      headline: "Vi talte om onboarding.",
      soWhat: "",
    });
    if (summary?.kind !== "summary") throw new Error("no summary");
    expect(summary.cards.map((c) => [c.title, c.text])).toEqual([
      ["Onboarding", "Dag 1 er tung."],
      ["Værktøjer", "p0"],
    ]);
  });

  it("tells it in chapters, each opened by a breaker, and ends with a closing slide", () => {
    const kinds = deck().map((s) => s.kind);
    const sections = deck().filter((s) => s.kind === "section");
    expect(sections.map((s) => [s.number, s.chapter])).toEqual([
      [1, "found"],
      [2, "means"],
      [3, "do"],
    ]);
    expect(kinds.indexOf("section")).toBeLessThan(kinds.indexOf("theme"));
    expect(kinds.at(-1)).toBe("closing");
    expect(kinds).not.toContain("themeMap"); // only from three themes
  });

  it("gives each named theme its notes, and splits a long one over two slides", () => {
    const themes = deck().filter((s) => s.kind === "theme");
    expect(themes.map((s) => [s.number, s.continued])).toEqual([
      [1, false],
      [2, false],
      [2, true],
    ]);
    expect(themes[0]!.notes.map((n) => n.id)).toEqual(["n0", "n1"]);
    expect(themes[1]!.notes).toHaveLength(NOTES_ON_THEME);
    expect(themes[1]!.moreNotes).toBe(3);
    expect(themes[2]!.points).toEqual([
      { index: POINTS_PER_SLIDE, text: `p${POINTS_PER_SLIDE}` },
      { index: POINTS_PER_SLIDE + 1, text: `p${POINTS_PER_SLIDE + 1}` },
    ]);
    expect(themes[2]!.notes).toEqual([]);
  });

  it("carries only the recommendations the facilitator kept", () => {
    const lists = deck().filter((s) => s.kind === "list");
    const recommendations = lists.find((s) => s.heading === "recommendations");
    expect(recommendations!.items).toEqual([{ id: "r1", text: "Beholdt" }]);
    expect(JSON.stringify(deck())).not.toContain("Kun et forslag");
  });

  it("splits the agreements, and leaves out empty lines", () => {
    const actions = deck().filter((s) => s.kind === "actions");
    expect(actions.map((s) => s.rows.length)).toEqual([ACTIONS_PER_SLIDE, 1]);
    expect(actions[0]!.rows[0]).toEqual({ id: "a0", what: "Gør 0", who: "Anna", when: "" });
    const open = deck().find((s) => s.kind === "list" && s.heading === "open");
    expect(open).toMatchObject({ items: [{ id: "o1", text: "Hvem ejer det?" }] });
  });

  it("ends with every note word for word only when asked, grouped by photo", () => {
    expect(deck(false).some((s) => s.kind === "transcript")).toBe(false);
    const transcript = deck(true).filter((s) => s.kind === "transcript");
    expect(transcript).toHaveLength(Math.ceil(notes.length / NOTES_PER_TRANSCRIPT));
    expect(transcript[0]!.groups.map((g) => [g.photo, g.notes.length])).toEqual([
      [1, 20],
      [2, 16],
    ]);
  });

  it("has a cover, a message and a closing even from an empty outline", () => {
    const empty = buildDeck({
      title: "W",
      date: "d",
      outline: EMPTY_OUTLINE,
      notes: [],
      includeTranscript: true,
    });
    expect(empty.map((s) => s.kind)).toEqual(["cover", "summary", "closing"]);
  });
});

describe("the language of the deck", () => {
  it("follows the notes: Danish unless they are clearly English", () => {
    expect(detectLanguage(["For mange systemer på dag 1", "Hvem spørger jeg?"])).toBe("da");
    expect(
      detectLanguage([
        "Too many systems on day one",
        "We should agree who owns the intranet",
        "The VPN is not working",
      ]),
    ).toBe("en");
    expect(detectLanguage(["VPN", "Teams"])).toBe("da");
    expect(formatDay("2026-11-12", "en")).toBe("12 November 2026");
    expect(formatDay("2026-11-12")).toBe("12. november 2026");
  });
});
