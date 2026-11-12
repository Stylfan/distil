"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Plus, RotateCw } from "lucide-react";
import { addNoteAction } from "@/actions/notes";
import { approvePhotoAction, deletePhotoAction } from "@/actions/photos";
import type { Note, PhotoStatus } from "@/db/schema";
import { Button, Input } from "@/components/ui/controls";
import { ConfirmButton } from "@/components/ui/confirm";
import { NoteRow } from "./note-row";
import { PhotoView } from "./photo-view";
import { PlaceNote } from "./place-note";
import { requestReading } from "./request-reading";

export type ReviewPhoto = {
  id: string;
  seq: number;
  width: number;
  height: number;
  status: PhotoStatus;
  error: string | null;
  hasImage: boolean;
  /** Milliseconds until the image is deleted anyway; null when it is gone. */
  imageExpiresIn: number | null;
};

/**
 * The desk for one photo: the photo on the left, what Distil read on the
 * right, side by side, so every note can be checked against the
 * handwriting. Approving deletes the image; the notes stay.
 */
export function ReviewPanel({
  workshopId,
  photo,
  notes,
}: {
  workshopId: string;
  photo: ReviewPhoto;
  notes: Note[];
}) {
  const t = useTranslations("review");
  const ti = useTranslations("intake");
  const tc = useTranslations("common");
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [newText, setNewText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const unsure = notes.filter((n) => n.unsure).length;
  const src = photo.hasImage ? `/workshops/${workshopId}/photos/${photo.id}/image` : null;
  const canRead = photo.hasImage && (photo.status === "waiting" || photo.status === "failed");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setMessage(null);
      const result = await fn();
      if (!result.ok) setMessage(result.error ? ti(`errors.${result.error}`) : t("saveFailed"));
      router.refresh();
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 xl:sticky xl:top-20 xl:self-start">
        <PhotoView
          src={src}
          width={photo.width}
          height={photo.height}
          notes={notes}
          active={active}
          onActive={setActive}
          onPlace={placing && !pin ? (x, y) => setPin({ x, y }) : undefined}
          pin={pin}
        />
        {(photo.status === "read" || photo.status === "approved") && (
          <PlaceNote
            photoId={photo.id}
            placing={placing}
            pin={pin}
            onStart={() => {
              setPlacing(true);
              setPin(null);
            }}
            onDone={() => {
              setPlacing(false);
              setPin(null);
              router.refresh();
            }}
          />
        )}
        <p className="text-[12px] text-slate">
          {photo.imageExpiresIn !== null
            ? t("deletedIn", { hours: Math.max(1, Math.ceil(photo.imageExpiresIn / 3_600_000)) })
            : t("imageGoneHint")}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold">{t("photoTitle", { number: photo.seq })}</h2>
          <span className="text-[13px] text-slate">
            {t("noteCount", { count: notes.length })}
            {unsure > 0 && (
              <span className="text-warning"> · {t("unsureCount", { count: unsure })}</span>
            )}
          </span>
          <span className="flex-1" />
          <ConfirmButton
            icon
            label={t("deletePhoto")}
            question={t("deletePhotoQuestion")}
            detail={t("deletePhotoDetail")}
            confirmLabel={t("deletePhotoConfirm")}
            cancelLabel={tc("cancel")}
            onConfirm={() =>
              act(async () => {
                const result = await deletePhotoAction(photo.id);
                if (result.ok) router.replace(`/workshops/${workshopId}`);
                return result;
              })
            }
          />
        </div>

        {photo.status === "reading" && <p className="text-[14px] text-slate">{ti("reading")}</p>}
        {photo.status === "failed" && photo.error && (
          <p className="text-[13px] text-danger">{ti(`errors.${photo.error}`)}</p>
        )}
        {canRead && (
          <Button
            variant="primary"
            className="self-start"
            disabled={pending}
            onClick={() => act(() => requestReading(photo.id))}
          >
            <RotateCw className="size-4" aria-hidden />
            {photo.status === "failed" ? t("readAgain") : t("read")}
          </Button>
        )}

        {notes.length > 0 && (
          <ol className="flex flex-col gap-0.5">
            {notes.map((n, i) => (
              <NoteRow
                key={`${n.id}-${n.updatedAt}`}
                note={n}
                number={i + 1}
                active={active === n.id}
                onActive={setActive}
              />
            ))}
          </ol>
        )}

        {(photo.status === "read" || photo.status === "approved") && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = newText.trim();
              if (!text) return;
              act(async () => {
                const result = await addNoteAction({ photoId: photo.id, text, colour: "yellow" });
                if (result.ok) setNewText("");
                return result;
              });
            }}
          >
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t("addPlaceholder")}
              aria-label={t("add")}
              maxLength={600}
            />
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" aria-hidden />
              {t("add")}
            </Button>
          </form>
        )}

        {photo.status === "read" && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-hairline pt-3">
            <Button
              variant={canRead ? "secondary" : "primary"}
              className="self-start"
              disabled={pending}
              onClick={() => act(() => approvePhotoAction(photo.id))}
            >
              <Check className="size-4" aria-hidden />
              {t("approve")}
            </Button>
            <p className="text-[12px] text-slate">
              {unsure > 0 ? t("approveHintUnsure", { count: unsure }) : t("approveHint")}
            </p>
          </div>
        )}
        {photo.status === "approved" && (
          <p className="flex items-center gap-1.5 text-[13px] text-success">
            <Check className="size-4" aria-hidden />
            {t("approved")}
          </p>
        )}
        {message && (
          <p role="alert" className="text-[13px] text-danger">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
