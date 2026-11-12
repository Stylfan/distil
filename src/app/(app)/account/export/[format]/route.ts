import { currentUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { exportAccount } from "@/services/export";

/**
 * The one-click export: everything the signed-in account owns, as JSON.
 * Nothing is stored; the file is built on request.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ format: string }> }) {
  const { format } = await params;
  if (format !== "json") return new Response(null, { status: 404 });
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });

  const data = await withUser(user.id, (tx) => exportAccount(tx, user.id));
  const stamp = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="distil-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
