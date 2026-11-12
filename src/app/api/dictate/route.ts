import { ReadError } from "@/ai/errors";
import { getDictation } from "@/ai/dictate";
import { currentUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { MAX_DICTATION_BYTES } from "@/domain/limits";
import { sameOrigin } from "@/lib/same-origin";
import { LimitReached } from "@/services/errors";
import { releaseDictation, reserveDictation } from "@/services/limits";

/**
 * Turns a short recording into text, for any field where the facilitator
 * would rather talk than type. Only from the app's own pages, for a
 * signed-in account, within the daily limits; the recording is sent to
 * Mistral and forgotten, never stored, and nothing about it is logged.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const AUDIO = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)(;|$)/;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  if (!AUDIO.test(type)) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_DICTATION_BYTES) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const language = new URL(request.url).searchParams.get("language") === "en" ? "en" : "da";
  try {
    await withUser(user.id, (tx) => reserveDictation(tx, user.id));
  } catch (error) {
    if (error instanceof LimitReached) return Response.json({ ok: false, error: error.kind });
    console.error("dictation failed");
    return Response.json({ ok: false, error: "generic" });
  }
  try {
    const text = await getDictation().transcribe(new Blob([bytes], { type }), language);
    return Response.json({ ok: true, text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await withUser(user.id, (tx) => releaseDictation(tx, user.id));
    if (error instanceof ReadError) return Response.json({ ok: false, error: error.code });
    console.error("dictation failed");
    return Response.json({ ok: false, error: "generic" });
  }
}
