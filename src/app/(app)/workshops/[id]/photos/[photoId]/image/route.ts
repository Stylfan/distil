import { currentUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { NotFound } from "@/services/errors";
import { getImage } from "@/services/photos";

/**
 * The image of a photo, to its owner only, while it is still kept. Never
 * cached anywhere: once the image is deleted, no copy is left in a browser
 * cache or a proxy either.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  const { photoId } = await params;
  try {
    const image = await withUser(user.id, (tx) => getImage(tx, user.id, photoId));
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if (error instanceof NotFound) return new Response(null, { status: 404 });
    throw error;
  }
}
