"use client";

import { useTranslations } from "next-intl";
import { ImageOff } from "lucide-react";
import type { Note } from "@/db/schema";
import { cn } from "@/lib/cn";

/**
 * The photo with a numbered marker where each note was read, so the
 * facilitator can match the text to the handwriting. Pointing at a marker
 * or a note lights up both. Once the image is deleted, the markers stay
 * on a plain sheet of the same shape, so the layout is still there.
 *
 * While placing, a click on the photo marks where a note Distil missed
 * hangs, so it can be written in at that spot.
 */
export function PhotoView({
  src,
  width,
  height,
  notes,
  active,
  onActive,
  onPlace,
  pin,
}: {
  src: string | null;
  width: number;
  height: number;
  notes: Note[];
  active: string | null;
  onActive: (id: string | null) => void;
  /** Set while the facilitator is placing a missed note: called with where they clicked, in thousandths. */
  onPlace?: (x: number, y: number) => void;
  /** The spot chosen for the note being written. */
  pin?: { x: number; y: number } | null;
}) {
  const t = useTranslations("review");
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-hairline bg-sand/50"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {src ? (
        // A private image from this server; next/image would cache it, which it must not be.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={t("photoAlt")} className="absolute inset-0 size-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] text-slate">
          <ImageOff className="size-5" aria-hidden />
          {t("imageGone")}
        </div>
      )}
      {onPlace && (
        <button
          type="button"
          aria-label={t("placeHere")}
          className="absolute inset-0 z-20 cursor-crosshair bg-ink/5"
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const x = Math.round(((e.clientX - box.left) / box.width) * 1000);
            const y = Math.round(((e.clientY - box.top) / box.height) * 1000);
            onPlace(Math.min(1000, Math.max(0, x)), Math.min(1000, Math.max(0, y)));
          }}
        />
      )}
      {pin && (
        <span
          aria-hidden
          className="absolute z-30 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-warning-soft text-[13px] font-bold text-ink"
          style={{ left: `${pin.x / 10}%`, top: `${pin.y / 10}%` }}
        >
          +
        </span>
      )}
      {notes.map((n, i) => (
        <button
          key={n.id}
          type="button"
          onMouseEnter={() => onActive(n.id)}
          onMouseLeave={() => onActive(null)}
          onFocus={() => onActive(n.id)}
          onBlur={() => onActive(null)}
          onClick={() => document.getElementById(`note-${n.id}`)?.focus()}
          aria-label={t("marker", { number: i + 1 })}
          className={cn(
            "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] font-semibold tabular transition-transform",
            n.unsure
              ? "border-warning bg-warning-soft text-warning"
              : "border-ink/70 bg-surface/90 text-ink",
            active === n.id && "z-10 scale-125 border-ink bg-ink text-paper",
          )}
          style={{ left: `${n.x / 10}%`, top: `${n.y / 10}%` }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
