/**
 * Shrinks a photo in the browser before it is sent: the longest side down
 * to SEND_EDGE, re-encoded as JPEG. That keeps uploads small on a phone
 * connection, keeps Mistral's bill per photo down, and drops the camera's
 * EXIF data (GPS position included), because a canvas carries none of it.
 *
 * What a phone or camera hands over: JPEG, PNG, WebP, GIF, AVIF and BMP
 * the browser decodes itself; HEIC and HEIF, what an iPhone takes, are
 * decoded by heic-to (libheif in the browser, LGPL-3.0), loaded only when
 * such a photo comes, because it is large. The photo never leaves the
 * device before it is a small JPEG.
 */

import { tileRects, type Rect } from "@/domain/tiles";

export const SEND_EDGE = 2000;
const QUALITY = 0.85;

/** Thrown when a file is not a photo Distil can read, whatever its name says. */
export class UnreadablePhoto extends Error {
  constructor() {
    super("unreadable photo");
  }
}

const HEIF_BRANDS = ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "mif2"];

/** Whether the file is HEIC or HEIF, from its own first bytes ("ftyp" and a brand), not its name. */
export async function looksLikeHeif(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = String.fromCharCode(...head);
  return text.slice(4, 8) === "ftyp" && HEIF_BRANDS.includes(text.slice(8, 12));
}

async function decode(file: Blob): Promise<ImageBitmap> {
  if (await looksLikeHeif(file)) {
    const { heicTo } = await import("heic-to/next");
    return heicTo({ blob: file, type: "bitmap", options: { imageOrientation: "from-image" } });
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnreadablePhoto();
  }
}

/** Draws a part of the bitmap (in pixels) at most SEND_EDGE long, as a JPEG on white. */
async function encode(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): Promise<Blob> {
  const scale = Math.min(1, SEND_EDGE / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new UnreadablePhoto();
  // White under a transparent PNG, so it does not turn black as a JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UnreadablePhoto())), "image/jpeg", QUALITY),
  );
}

export type PreparedPhoto = { whole: Blob; parts: { blob: Blob; rect: Rect }[] };

/**
 * The photo as it is sent: the whole of it, shrunk, for the desk and the
 * drawing; and, when it is large, four overlapping parts at nearly full
 * resolution, so small handwriting can be read (src/domain/tiles.ts).
 */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const bitmap = await decode(file);
  try {
    const whole = await encode(bitmap, 0, 0, bitmap.width, bitmap.height);
    const parts: PreparedPhoto["parts"] = [];
    for (const rect of tileRects(bitmap.width, bitmap.height)) {
      const sx = (rect.x / 1000) * bitmap.width;
      const sy = (rect.y / 1000) * bitmap.height;
      const blob = await encode(
        bitmap,
        sx,
        sy,
        (rect.w / 1000) * bitmap.width,
        (rect.h / 1000) * bitmap.height,
      );
      parts.push({ blob, rect });
    }
    return { whole, parts };
  } finally {
    bitmap.close();
  }
}
