import { withUser } from "@/db/client";
import { withLink } from "@/lib/link-route";
import { readPhoto } from "@/lib/read-photo";
import { photoWorkshop } from "@/services/photos";

/** Reads a photo sent by a phone let in by a link; only a photo of the link's workshop. */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; photoId: string }> },
) {
  const { token, photoId } = await params;
  return withLink(request, token, async ({ userId, workshopId }) => {
    const home = await withUser(userId, (tx) => photoWorkshop(tx, userId, photoId)).catch(
      () => null,
    );
    if (home !== workshopId) return Response.json({ ok: false, error: "notFound" });
    return Response.json(await readPhoto(userId, photoId), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
