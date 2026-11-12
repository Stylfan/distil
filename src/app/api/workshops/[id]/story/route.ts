import { currentUser } from "@/auth/session";
import { runStory } from "@/lib/story-run";
import { sameOrigin } from "@/lib/same-origin";

/**
 * Lets Distil tell the story of the presentation from the approved
 * outline. A route rather than a server action, because it takes many
 * seconds; only from the app's own pages.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const outcome = await runStory(user.id, id);
  return Response.json(outcome, { headers: { "Cache-Control": "no-store" } });
}
