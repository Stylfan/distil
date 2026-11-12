import { z } from "zod";
import { currentUser } from "@/auth/session";
import { runOutline } from "@/lib/outline-run";
import { sameOrigin } from "@/lib/same-origin";

/**
 * Makes the outline of a workshop, or changes it as the facilitator asks
 * ("slå 2 og 3 sammen"). A route rather than a server action, because it
 * takes many seconds and the browser runs server actions one at a time;
 * only from the app's own pages.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const body = z.object({ request: z.string().trim().max(1000).nullable().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  const { id } = await params;
  const outcome = await runOutline(user.id, id, parsed.data.request || null);
  return Response.json(outcome, { headers: { "Cache-Control": "no-store" } });
}
