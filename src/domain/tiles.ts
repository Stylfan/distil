import type { ReadItem } from "./reading";

/**
 * Reading a large photo in parts. A phone photo of a whole wall, shrunk
 * to one image the model reads, leaves small handwriting a few pixels
 * high; on a real wall the model then filled the gaps with notes that
 * were not there. Cut into four overlapping parts at full resolution, the
 * same wall was read more than twice as well, with nothing invented.
 *
 * The parts overlap so that no note is lost at a seam; a note in the
 * overlap is read twice and merged here, keeping the reading from the
 * part in which the note sat furthest from the edge.
 */

/** A part of the photo in thousandths of its width and height. */
export type Rect = { x: number; y: number; w: number; h: number };

export const TILE_GRID = 2;
export const TILE_OVERLAP = 0.1;
/** Below this, a photo is read whole: its writing is large enough already. */
export const TILE_FROM_EDGE = 2400;

/** The overlapping parts a photo of this size is cut into; none when it is small enough to read whole. */
export function tileRects(width: number, height: number): Rect[] {
  if (Math.max(width, height) < TILE_FROM_EDGE) return [];
  const step = 1000 / TILE_GRID;
  const pad = step * TILE_OVERLAP;
  const rects: Rect[] = [];
  for (let row = 0; row < TILE_GRID; row++) {
    for (let col = 0; col < TILE_GRID; col++) {
      const x = Math.max(0, col * step - pad);
      const y = Math.max(0, row * step - pad);
      const right = Math.min(1000, (col + 1) * step + pad);
      const bottom = Math.min(1000, (row + 1) * step + pad);
      rects.push({
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(right - x),
        h: Math.round(bottom - y),
      });
    }
  }
  return rects;
}

/** An item read in a part, placed on the whole photo. */
function onWhole(item: ReadItem, rect: Rect): ReadItem & { edge: number } {
  // How far the note sat from the part's nearest edge: the further, the better it was seen.
  const edge = Math.min(item.x, 1000 - item.x, item.y, 1000 - item.y);
  return {
    ...item,
    x: Math.round(rect.x + (item.x * rect.w) / 1000),
    y: Math.round(rect.y + (item.y * rect.h) / 1000),
    edge,
  };
}

const normal = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** How alike two texts are, 0 to 1, from their edit distance. */
export function likeness(a: string, b: string): number {
  const x = normal(a);
  const y = normal(b);
  if (!x || !y) return x === y ? 1 : 0;
  if (x.includes(y) || y.includes(x))
    return Math.min(x.length, y.length) / Math.max(x.length, y.length) >= 0.5 ? 1 : 0.5;
  const row = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const keep = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return 1 - row[y.length]! / Math.max(x.length, y.length);
}

/** Two readings this close on the photo, and this alike, are the same note read twice. */
const SAME_PLACE = 70;
const SAME_TEXT = 0.75;

export function mergeTiles(parts: { rect: Rect; items: ReadItem[] }[]): ReadItem[] {
  const kept: (ReadItem & { edge: number })[] = [];
  for (const part of parts) {
    for (const item of part.items.map((i) => onWhole(i, part.rect))) {
      const twin = kept.findIndex(
        (k) =>
          Math.hypot(k.x - item.x, k.y - item.y) <= SAME_PLACE &&
          likeness(k.text, item.text) >= SAME_TEXT,
      );
      if (twin === -1) kept.push(item);
      else if (item.edge > kept[twin]!.edge) kept[twin] = item;
    }
  }
  return kept.map((k) => {
    const item: ReadItem & { edge?: number } = { ...k };
    delete item.edge;
    return item;
  });
}
