/**
 * Whether a request comes from the app's own pages: its Origin header
 * names the host it was sent to (or DISTIL_URL when that is set). Server
 * actions check this themselves; routes that change data check it here.
 */
export function sameOrigin(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const configured = env.DISTIL_URL?.trim();
  if (configured) return origin === new URL(configured).origin;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
