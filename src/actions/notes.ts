"use server";

import { z } from "zod";
import { NOTE_COLOURS, NOTE_KINDS } from "@/db/schema";
import { MAX_TEXT_LENGTH, MAX_VOTES } from "@/domain/reading";
import { addNote, deleteNote, updateNote } from "@/services/notes";
import { run, type Result } from "./result";

const text = z.string().trim().min(1).max(MAX_TEXT_LENGTH);

const update = z.object({
  id: z.string().min(1),
  text: text.optional(),
  colour: z.enum(NOTE_COLOURS).optional(),
  kind: z.enum(NOTE_KINDS).optional(),
  votes: z.number().int().min(0).max(MAX_VOTES).optional(),
});

export async function updateNoteAction(input: z.infer<typeof update>): Promise<Result> {
  return run(update, input, async (db, userId, { id, ...change }) => {
    await updateNote(db, userId, id, change);
    return undefined;
  });
}

const permille = z.number().int().min(0).max(1000);
const add = z.object({
  photoId: z.string().min(1),
  text,
  colour: z.enum(NOTE_COLOURS),
  x: permille.optional(),
  y: permille.optional(),
});

export async function addNoteAction(input: z.infer<typeof add>): Promise<Result<string>> {
  return run(add, input, (db, userId, d) => addNote(db, userId, d.photoId, d));
}

export async function deleteNoteAction(id: string): Promise<Result> {
  return run(z.string().min(1), id, async (db, userId, noteId) => {
    await deleteNote(db, userId, noteId);
    return undefined;
  });
}
