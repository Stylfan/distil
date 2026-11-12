import { ReadError, getReader } from "@/ai/reader";
import type { ReadItem } from "@/domain/reading";
import { mergeTiles } from "@/domain/tiles";
import { withUser } from "@/db/client";
import { NotFound, type LimitKind } from "@/services/errors";
import { storeDiagram } from "@/services/diagrams";
import { failReading, finishReading, startReading } from "@/services/photos";

/**
 * Reads one photo with the model, as the given user. In three steps, so
 * no transaction is held open while the model works: claim the photo and
 * count it, read it, store the notes and any drawing (or the failure,
 * which gives the place back).
 */

export type ReadOutcome =
  | { ok: true; notes: number }
  | { ok: false; error: "notFound" | "generic" | LimitKind | ReadError["code"] };

export async function readPhoto(userId: string, photoId: string): Promise<ReadOutcome> {
  try {
    const start = await withUser(userId, (tx) => startReading(tx, userId, photoId));
    if (start.kind === "limit") return { ok: false, error: start.limit };
    if (start.kind === "nothing") return { ok: true, notes: 0 };
    try {
      const reader = getReader();
      // The whole photo for its drawing and layout; its parts, when it came cut up, for the words.
      const [whole, ...parts] = await Promise.all([
        reader.read(start.data, start.mime),
        ...start.parts.map((p) => reader.readPart(p.data, start.mime)),
      ]);
      const diagram = whole!.diagram;
      const merged =
        start.parts.length > 0
          ? mergeTiles(start.parts.map((p, i) => ({ rect: p.rect, items: parts[i] as ReadItem[] })))
          : [];
      // The parts read nothing (a blank board, or a reader that only reads whole photos): the whole one counts.
      const items = merged.length > 0 ? merged : whole!.items;
      await withUser(userId, async (tx) => {
        await finishReading(tx, userId, photoId, items);
        await storeDiagram(tx, userId, photoId, diagram);
      });
      return { ok: true, notes: items.length };
    } catch (error) {
      const code = error instanceof ReadError ? error.code : "provider";
      if (!(error instanceof ReadError)) console.error("reading failed", error);
      await withUser(userId, (tx) => failReading(tx, userId, photoId, code));
      return { ok: false, error: code };
    }
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: "notFound" };
    console.error("reading failed", error);
    return { ok: false, error: "generic" };
  }
}
