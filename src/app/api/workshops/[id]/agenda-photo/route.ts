import { ReadError } from "@/ai/errors";
import { getTranscriber } from "@/ai/transcribe";
import { currentUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { checkImage } from "@/domain/image";
import { sameOrigin } from "@/lib/same-origin";
import { LimitReached, NotFound } from "@/services/errors";
import { releaseOutline, reserveOutline } from "@/services/limits";
import { requireWorkshop } from "@/services/workshops";

/**
 * Reads a photo of the workshop's agenda (a handwritten page, a flip
 * chart) into text, and returns it for the facilitator to check. The photo
 * is shrunk in the browser first, checked again here, sent to Mistral and
 * then forgotten: it is never stored, and nothing about it is logged. It
 * counts against the same daily limit as an outline.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const bytes = new Uint8Array(await request.arrayBuffer());
  const image = checkImage(bytes);
  if (!image.ok) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  try {
    const reserved = await withUser(user.id, async (tx) => {
      await requireWorkshop(tx, user.id, id);
      try {
        await reserveOutline(tx, user.id);
        return null;
      } catch (error) {
        if (error instanceof LimitReached) return error.kind;
        throw error;
      }
    });
    if (reserved) return Response.json({ ok: false, error: reserved });
    try {
      const text = await getTranscriber().transcribe(Buffer.from(bytes), image.mime);
      return Response.json({ ok: true, text }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await withUser(user.id, (tx) => releaseOutline(tx, user.id));
      if (error instanceof ReadError) return Response.json({ ok: false, error: error.code });
      throw error;
    }
  } catch (error) {
    if (error instanceof NotFound)
      return Response.json({ ok: false, error: "notFound" }, { status: 404 });
    console.error("agenda photo failed");
    return Response.json({ ok: false, error: "generic" });
  }
}
