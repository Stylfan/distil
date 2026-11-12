import { newId, outlineSchema, type Outline } from "./outline";

/**
 * Between the notes and the model, both ways. The notes go out as short
 * numbered lines ("n12"), so the model can point at them without seeing
 * any database id; what comes back is untrusted input, parsed leniently,
 * its note references mapped back to real ids (unknown ones dropped), and
 * then checked against the outline's own schema.
 */

export type NoteForOutline = {
  id: string;
  text: string;
  colour: string;
  kind: string;
  photo: number;
};

export type NoteRefs = { lines: string; toId: Map<string, string> };

export function notesForModel(notes: NoteForOutline[]): NoteRefs {
  const toId = new Map<string, string>();
  const lines = notes.map((n, i) => {
    const ref = `n${i + 1}`;
    toId.set(ref, n.id);
    const tags = [
      n.kind !== "note" ? n.kind : null,
      n.colour !== "none" ? n.colour : null,
      `photo ${n.photo}`,
    ]
      .filter(Boolean)
      .join(", ");
    return `${ref} [${tags}] ${n.text.replace(/\s+/g, " ")}`;
  });
  return { lines: lines.join("\n"), toId };
}

/** The reverse of what goes out: real note ids as refs, for an outline sent back for changes. */
export function outlineForModel(outline: Outline, toId: Map<string, string>): unknown {
  const toRef = new Map([...toId].map(([ref, id]) => [id, ref]));
  const refs = (ids: string[]) => ids.map((id) => toRef.get(id)).filter(Boolean);
  return {
    ...outline,
    themes: outline.themes.map(({ noteIds, ...t }) => ({ ...t, notes: refs(noteIds) })),
    actions: outline.actions.map(({ noteIds, ...a }) => ({ ...a, notes: refs(noteIds) })),
    openPoints: outline.openPoints.map(({ noteIds, ...o }) => ({ ...o, notes: refs(noteIds) })),
  };
}

type Raw = Record<string, unknown>;

const record = (v: unknown): Raw | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Raw) : null;
const text = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[ \t]+/g, " ")
        .trim()
        .slice(0, max)
    : "";
const items = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strings = (v: unknown): string[] =>
  items(v).filter((s): s is string => typeof s === "string");

/** A list entry that may come as a plain string or as {id, text, ...}. */
function entry(v: unknown): { id: string; text: string; raw: Raw } {
  if (typeof v === "string") return { id: "", text: text(v, 600), raw: {} };
  const r = record(v) ?? {};
  return { id: text(r.id, 40), text: text(r.text, 600), raw: r };
}

/** An outline from the model's answer, or null when the answer is not one at all. */
export function parseOutline(
  raw: unknown,
  toId: Map<string, string>,
  previous: Outline | null = null,
): Outline | null {
  const o = record(raw);
  if (!o) return null;
  const ids = (r: unknown) => [
    ...new Set(
      strings(r)
        .map((ref) => toId.get(ref))
        .filter((x): x is string => !!x),
    ),
  ];
  const keep = (id: string, prefix: string) => (/^[\w-]{1,40}$/.test(id) ? id : newId(prefix));
  const kept = new Set(previous?.recommendations.filter((r) => r.kept).map((r) => r.text) ?? []);

  const outline: Outline = {
    summary: text(o.summary, 2000),
    themes: items(o.themes)
      .map(record)
      .filter((t): t is Raw => !!t && !!text(t.title, 600))
      .slice(0, 20)
      .map((t) => ({
        id: keep(text(t.id, 40), "t"),
        title: text(t.title, 600),
        summary: text(t.summary, 1500),
        points: items(t.points)
          .map((p) => text(p, 600))
          .filter(Boolean)
          .slice(0, 30),
        noteIds: ids(t.notes).slice(0, 200),
      })),
    patterns: items(o.patterns)
      .map(entry)
      .filter((p) => p.text)
      .slice(0, 15)
      .map((p) => ({ id: keep(p.id, "p"), text: p.text })),
    recommendations: items(o.recommendations)
      .map(entry)
      .filter((r) => r.text)
      .slice(0, 15)
      .map((r) => ({ id: keep(r.id, "r"), text: r.text, kept: kept.has(r.text) })),
    actions: items(o.actions)
      .map(record)
      .filter((a): a is Raw => !!a && !!text(a.what, 600))
      .slice(0, 40)
      .map((a) => ({
        id: keep(text(a.id, 40), "a"),
        what: text(a.what, 600),
        who: text(a.who, 120),
        when: text(a.when, 120),
        noteIds: ids(a.notes),
      })),
    openPoints: items(o.openPoints)
      .map(entry)
      .filter((p) => p.text)
      .slice(0, 40)
      .map((p) => ({ id: keep(p.id, "o"), text: p.text, noteIds: ids(p.raw.notes) })),
    questions: items(o.questions)
      .map(entry)
      .filter((q) => q.text)
      .slice(0, 10)
      .map((q) => {
        const answer = text(q.raw.answer, 600);
        return {
          id: keep(q.id, "q"),
          text: q.text,
          options: items(q.raw.options)
            .map((x) => text(x, 120))
            .filter(Boolean)
            .slice(0, 4),
          answer: answer || null,
        };
      }),
  };
  const checked = outlineSchema.safeParse(outline);
  return checked.success ? checked.data : null;
}
