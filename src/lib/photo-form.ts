import type { PhotoPart } from "@/services/photos";

/**
 * What an upload carries: the photo, shrunk, as "photo"; and when it is
 * large, its parts cut out at full resolution as "part1", "part2", … with
 * where each lies in "parts" (a JSON list of rects). Read the same way by
 * the server action and by the phone-link route. Null when the form is
 * not one.
 */
export async function readPhotoForm(
  form: FormData,
): Promise<{ bytes: Buffer; parts: PhotoPart[] } | null> {
  const photo = form.get("photo");
  if (!(photo instanceof File)) return null;
  const bytes = Buffer.from(await photo.arrayBuffer());
  let rects: unknown = [];
  try {
    rects = JSON.parse(String(form.get("parts") ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(rects) || rects.length > 4) return null;
  const parts: PhotoPart[] = [];
  for (const [i, rect] of rects.entries()) {
    const file = form.get(`part${i + 1}`);
    if (!(file instanceof File) || typeof rect !== "object" || rect === null) return null;
    const { x, y, w, h } = rect as Record<string, unknown>;
    if (![x, y, w, h].every((v) => typeof v === "number")) return null;
    parts.push({
      bytes: Buffer.from(await file.arrayBuffer()),
      rect: { x: x as number, y: y as number, w: w as number, h: h as number },
    });
  }
  return { bytes, parts };
}
