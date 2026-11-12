import { currentUser } from "@/auth/session";
import { readPhoto } from "@/lib/read-photo";
import { sameOrigin } from "@/lib/same-origin";

/**
 * Reads one photo. A route rather than a server action, because the
 * browser runs server actions one at a time, and a reading takes many
 * seconds: here the next photo can be sent while the last is read. Only
 * from the app's own pages: the session cookie is SameSite=Lax, and the
 * origin is checked as well.
 */

export const dynamic = "force-dynamic";
// A reading may take a while at Mistral.
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { photoId } = await params;
  const outcome = await readPhoto(user.id, photoId);
  return Response.json(outcome, { headers: { "Cache-Control": "no-store" } });
}
