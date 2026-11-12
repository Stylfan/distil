import type { OutlineOutcome } from "@/lib/outline-run";

/** Asks the server to make the outline, or to change it as asked. */
export async function requestOutline(
  workshopId: string,
  request: string | null,
): Promise<OutlineOutcome | { ok: false; error: "unauthorized" | "invalid" }> {
  try {
    const response = await fetch(`/api/workshops/${encodeURIComponent(workshopId)}/outline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    });
    return (await response.json()) as OutlineOutcome;
  } catch {
    return { ok: false, error: "provider" };
  }
}
