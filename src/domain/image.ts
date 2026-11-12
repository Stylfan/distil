import { MAX_PHOTO_BYTES, MAX_PHOTO_EDGE, MIN_PHOTO_EDGE } from "./limits";

/**
 * What the server checks of an uploaded photo before keeping it. The
 * browser always sends a JPEG it has shrunk itself (which also drops the
 * camera's EXIF data, GPS position included), so anything else is refused:
 * the type is read from the bytes, never from the name or the browser's
 * word, and the size from the JPEG's own frame header.
 */

export type ImageCheck =
  | { ok: true; width: number; height: number; mime: "image/jpeg" }
  | { ok: false; reason: "type" | "size" | "dimensions" };

/** Width and height from a JPEG's start-of-frame segment, or null if it is not a JPEG we can read. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    // Fill bytes before a marker.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Markers without a length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (length < 2) return null;
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[i + 5]! << 8) | bytes[i + 6]!;
      const width = (bytes[i + 7]! << 8) | bytes[i + 8]!;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + length;
  }
  return null;
}

export function checkImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return { ok: false, reason: "size" };
  const size = jpegSize(bytes);
  if (!size) return { ok: false, reason: "type" };
  const long = Math.max(size.width, size.height);
  const short = Math.min(size.width, size.height);
  if (long > MAX_PHOTO_EDGE || short < MIN_PHOTO_EDGE) return { ok: false, reason: "dimensions" };
  return { ok: true, ...size, mime: "image/jpeg" };
}
