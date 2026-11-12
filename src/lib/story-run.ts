import { ReadError } from "@/ai/errors";
import { getStoryteller } from "@/ai/storyteller";
import { withUser } from "@/db/client";
import { contextForModel } from "@/domain/context";
import type { Outline } from "@/domain/outline";
import type { NoteForOutline } from "@/domain/outline-reading";
import { LimitReached, NotFound, type LimitKind } from "@/services/errors";
import { releaseOutline, reserveOutline } from "@/services/limits";
import { getOutline, notesOfWorkshop, storeStory } from "@/services/outlines";
import { requireWorkshop } from "@/services/workshops";

/**
 * Telling the story of a workshop's presentation with the model, or
 * changing it as the facilitator asks on the presentation, as the given
 * user, in three steps so no transaction is held open while the model
 * works. It counts against the same daily limit as an outline: it is one
 * call to Mistral with the outline's text.
 */

export type StoryOutcome =
  | { ok: true; reply: string }
  | { ok: false; error: "notFound" | "generic" | "noOutline" | LimitKind | ReadError["code"] };

type Prepared = { outline: Outline; notes: NoteForOutline[]; context: string };

async function prepare(userId: string, workshopId: string): Promise<Prepared | StoryOutcome> {
  return withUser(userId, async (tx) => {
    const workshop = await requireWorkshop(tx, userId, workshopId);
    const row = await getOutline(tx, userId, workshopId);
    if (!row || row.content.themes.length === 0) return { ok: false, error: "noOutline" } as const;
    try {
      await reserveOutline(tx, userId);
    } catch (error) {
      if (error instanceof LimitReached) return { ok: false, error: error.kind } as const;
      throw error;
    }
    return {
      outline: row.content,
      notes: await notesOfWorkshop(tx, userId, workshopId),
      context: contextForModel(workshop.context),
    };
  });
}

export async function runStory(
  userId: string,
  workshopId: string,
  request: string | null = null,
): Promise<StoryOutcome> {
  try {
    const prepared = await prepare(userId, workshopId);
    if ("ok" in prepared) return prepared;
    const { outline, notes, context } = prepared;
    try {
      const told = await getStoryteller().tell(outline, notes, {
        context,
        request: request ?? "",
        current: outline.story ?? null,
      });
      await withUser(userId, (tx) => storeStory(tx, userId, workshopId, told.story));
      return { ok: true, reply: told.reply };
    } catch (error) {
      await withUser(userId, (tx) => releaseOutline(tx, userId));
      if (error instanceof ReadError) return { ok: false, error: error.code };
      throw error;
    }
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: "notFound" };
    console.error("story failed", error);
    return { ok: false, error: "generic" };
  }
}
