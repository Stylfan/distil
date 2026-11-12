import { withUser } from "@/db/client";
import { withLink } from "@/lib/link-route";
import { readPhotoForm } from "@/lib/photo-form";
import { BadPhoto, LimitReached } from "@/services/errors";
import { addPhoto } from "@/services/photos";

/** A photo from a phone let in by a link, into the link's workshop. */

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withLink(request, token, async ({ userId, workshopId }) => {
    const form = await request.formData().catch(() => null);
    const upload = form ? await readPhotoForm(form) : null;
    if (!upload) return Response.json({ ok: false, error: "invalid" });
    try {
      const photoId = await withUser(userId, (tx) =>
        addPhoto(tx, userId, workshopId, upload.bytes, Date.now(), upload.parts),
      );
      return Response.json({ ok: true, photoId });
    } catch (error) {
      if (error instanceof BadPhoto) return Response.json({ ok: false, error: error.reason });
      if (error instanceof LimitReached) return Response.json({ ok: false, error: error.kind });
      console.error("upload by link failed", error);
      return Response.json({ ok: false, error: "generic" });
    }
  });
}
