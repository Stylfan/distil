import { getDb } from "@/db/client";
import { sameOrigin } from "@/lib/same-origin";
import { resolvePhoneLink, type LinkAccess } from "@/services/phone-links";

/**
 * The start of every request from a phone let in by a link: from the
 * app's own page, and a link that is known and not yet expired. Then the
 * work runs as the link's owner, in the link's workshop only.
 */
export async function withLink(
  request: Request,
  token: string,
  fn: (access: LinkAccess) => Promise<Response>,
): Promise<Response> {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const access = await resolvePhoneLink(getDb(), token);
  if (!access) return Response.json({ ok: false, error: "expired" }, { status: 401 });
  return fn(access);
}
