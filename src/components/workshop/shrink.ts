/**
 * Shrinks a photo in the browser before it is sent: the longest side down
 * to SEND_EDGE, re-encoded as JPEG. That keeps uploads small on a phone
 * connection, keeps Mistral's bill per photo down, and drops the camera's
 * EXIF data (GPS position included), because a canvas carries none of it.
 * Uses only what the browser has; no library.
 */

export const SEND_EDGE = 2000;
const QUALITY = 0.85;

export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, SEND_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", QUALITY),
    );
  } finally {
    bitmap.close();
  }
}
