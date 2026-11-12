import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { notes, outlines, photos, type OutlineRow } from "@/db/schema";
import { keepAnswers, outlineSchema, type Outline } from "@/domain/outline";
import type { NoteForOutline } from "@/domain/outline-reading";
import type { Look, Story } from "@/domain/story";
import { Conflict, NotFound } from "./errors";
import { requireWorkshop } from "./workshops";

/**
 * A workshop's outline: one document, made by Distil and then shaped by
 * the facilitator. Every save is checked against the outline's schema and
 * against the version it was based on, so two windows (the phone and the
 * computer) cannot overwrite each other unseen.
 */

export async function getOutline(
  db: Db,
  userId: string,
  workshopId: string,
): Promise<OutlineRow | null> {
  await requireWorkshop(db, userId, workshopId);
  const [row] = await db.select().from(outlines).where(eq(outlines.workshopId, workshopId));
  return row ?? null;
}

/** The outline, locked until the transaction ends, for a read-change-write. */
async function lockOutline(db: Db, userId: string, workshopId: string) {
  await requireWorkshop(db, userId, workshopId);
  const [row] = await db
    .select()
    .from(outlines)
    .where(eq(outlines.workshopId, workshopId))
    .for("update");
  return row ?? null;
}

/** The notes Distil works from: those of every photo that has been read, in order. */
export async function notesOfWorkshop(
  db: Db,
  userId: string,
  workshopId: string,
): Promise<NoteForOutline[]> {
  await requireWorkshop(db, userId, workshopId);
  return db
    .select({
      id: notes.id,
      text: notes.text,
      colour: notes.colour,
      kind: notes.kind,
      photo: photos.seq,
      votes: notes.votes,
      unsure: notes.unsure,
    })
    .from(notes)
    .innerJoin(photos, eq(photos.id, notes.photoId))
    .where(and(eq(notes.workshopId, workshopId), inArray(photos.status, ["read", "approved"])))
    .orderBy(asc(photos.seq), asc(notes.seq));
}

/** Stores what Distil made, keeping the facilitator's answers and the version before. */
export async function storeGenerated(
  db: Db,
  userId: string,
  workshopId: string,
  outline: Outline,
  now = Date.now(),
): Promise<void> {
  const current = await lockOutline(db, userId, workshopId);
  // The colour theme stays; the story was told for the outline before, so it goes.
  const content = outlineSchema.parse({
    ...keepAnswers(outline, current?.content ?? null),
    story: null,
    look: current?.content.look,
  });
  if (!current) {
    await db.insert(outlines).values({ workshopId, content, generatedAt: now });
    return;
  }
  await db
    .update(outlines)
    .set({ content, previous: current.content, version: current.version + 1, generatedAt: now })
    .where(eq(outlines.id, current.id));
}

/** The facilitator's own edit of the whole outline, based on `version`. Returns the new version. */
export async function saveOutline(
  db: Db,
  userId: string,
  workshopId: string,
  content: Outline,
  version: number,
): Promise<number> {
  const current = await lockOutline(db, userId, workshopId);
  if (!current) throw new NotFound();
  // The questions are answered on their own (answerQuestion), so an edit never undoes an answer.
  // An editor that does not know the story or the colour theme leaves them as they were.
  const checked = outlineSchema.parse({
    ...content,
    story: content.story === undefined ? current.content.story : content.story,
    look: content.look ?? current.content.look,
    questions: current.content.questions,
  });
  const saved = await db
    .update(outlines)
    .set({ content: checked, version: version + 1 })
    .where(and(eq(outlines.id, current.id), eq(outlines.version, version)))
    .returning({ version: outlines.version });
  if (saved.length === 0) throw new Conflict();
  return saved[0]!.version;
}

/**
 * An answer to one of Distil's questions, from the phone or the computer.
 * Touches only that answer and leaves the version alone, so it never
 * conflicts with an edit on the computer at the same time.
 */
export async function answerQuestion(
  db: Db,
  userId: string,
  workshopId: string,
  questionId: string,
  answer: string,
): Promise<void> {
  const current = await lockOutline(db, userId, workshopId);
  if (!current) throw new NotFound();
  if (!current.content.questions.some((q) => q.id === questionId)) throw new NotFound();
  const content: Outline = {
    ...current.content,
    questions: current.content.questions.map((q) =>
      q.id === questionId ? { ...q, answer: answer.trim() || null } : q,
    ),
  };
  await db
    .update(outlines)
    .set({ content: outlineSchema.parse(content) })
    .where(eq(outlines.id, current.id));
}

/** Goes back to the outline before Distil's last change. */
export async function undoGenerated(db: Db, userId: string, workshopId: string): Promise<void> {
  const current = await lockOutline(db, userId, workshopId);
  if (!current?.previous) throw new NotFound();
  await db
    .update(outlines)
    .set({ content: current.previous, previous: null, version: current.version + 1 })
    .where(eq(outlines.id, current.id));
}

/** Whether the presentation ends with the transcript; a setting, so it leaves the version alone. */
export async function setIncludeTranscript(
  db: Db,
  userId: string,
  workshopId: string,
  include: boolean,
): Promise<void> {
  const current = await lockOutline(db, userId, workshopId);
  if (!current) throw new NotFound();
  await db.update(outlines).set({ includeTranscript: include }).where(eq(outlines.id, current.id));
}

/** The story Distil told for the outline as it is now; a new version, so open editors reload. */
export async function storeStory(
  db: Db,
  userId: string,
  workshopId: string,
  story: Story,
): Promise<void> {
  const current = await lockOutline(db, userId, workshopId);
  if (!current) throw new NotFound();
  await db
    .update(outlines)
    .set({
      content: outlineSchema.parse({ ...current.content, story }),
      version: current.version + 1,
    })
    .where(eq(outlines.id, current.id));
}

/** The colour theme of the presentation; a setting, so it leaves the version alone. */
export async function setLook(
  db: Db,
  userId: string,
  workshopId: string,
  look: Look,
): Promise<void> {
  const current = await lockOutline(db, userId, workshopId);
  if (!current) throw new NotFound();
  await db
    .update(outlines)
    .set({ content: outlineSchema.parse({ ...current.content, look }) })
    .where(eq(outlines.id, current.id));
}

/** The notes Distil's questions are about, for showing them with the question. */
export async function notesOfQuestions(
  db: Db,
  userId: string,
  workshopId: string,
  outline: Outline | null,
): Promise<{ id: string; text: string; colour: string; photo: number }[]> {
  const wanted = new Set(outline?.questions.flatMap((q) => q.noteIds ?? []) ?? []);
  if (wanted.size === 0) return [];
  const all = await notesOfWorkshop(db, userId, workshopId);
  return all
    .filter((n) => wanted.has(n.id))
    .map((n) => ({ id: n.id, text: n.text, colour: n.colour, photo: n.photo }));
}
