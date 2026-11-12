import { z } from "zod";
import { withUser } from "@/db/client";
import { withLink } from "@/lib/link-route";
import { answerQuestion } from "@/services/outlines";

/** An answer to one of Distil's questions, from a phone let in by a link. */

export const dynamic = "force-dynamic";

const body = z.object({ questionId: z.string().min(1).max(40), answer: z.string().max(600) });

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withLink(request, token, async ({ userId, workshopId }) => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, error: "invalid" });
    try {
      await withUser(userId, (tx) =>
        answerQuestion(tx, userId, workshopId, parsed.data.questionId, parsed.data.answer),
      );
      return Response.json({ ok: true });
    } catch {
      return Response.json({ ok: false, error: "notFound" });
    }
  });
}
