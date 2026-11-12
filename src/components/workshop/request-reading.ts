import type { ReadOutcome } from "@/lib/read-photo";

/** Asks the server to read one photo; a lost connection reads as a provider failure. */
export async function requestReading(
  photoId: string,
): Promise<ReadOutcome | { ok: false; error: "unauthorized" }> {
  try {
    const response = await fetch(`/api/photos/${encodeURIComponent(photoId)}/read`, {
      method: "POST",
    });
    return (await response.json()) as ReadOutcome;
  } catch {
    return { ok: false, error: "provider" };
  }
}
