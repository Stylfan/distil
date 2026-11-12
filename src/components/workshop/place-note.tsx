"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MapPin, X } from "lucide-react";
import { addNoteAction } from "@/actions/notes";
import { NOTE_COLOURS, type NoteColour } from "@/db/schema";
import { Button, Input, Select } from "@/components/ui/controls";

/**
 * A note Distil did not read, put in where it hangs: press the button,
 * click the note on the photo, write what it says and its colour. It then
 * gets its numbered marker like any other note, and is marked as written
 * by the facilitator.
 */
export function PlaceNote({
  photoId,
  placing,
  pin,
  onStart,
  onDone,
}: {
  photoId: string;
  placing: boolean;
  pin: { x: number; y: number } | null;
  onStart: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("review");
  const tc = useTranslations("colours");
  const [text, setText] = useState("");
  const [colour, setColour] = useState<NoteColour>("yellow");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  if (!placing) {
    return (
      <Button size="sm" variant="ghost" className="self-start" onClick={onStart}>
        <MapPin className="size-3.5" aria-hidden />
        {t("place")}
      </Button>
    );
  }
  if (!pin) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-ink">
        <MapPin className="size-4 text-warning" aria-hidden />
        {t("placeHint")}
        <button
          type="button"
          onClick={onDone}
          className="ml-auto text-slate underline underline-offset-4"
        >
          {t("placeCancel")}
        </button>
      </p>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/50 bg-warning-soft/60 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const words = text.trim();
        if (!words) return;
        start(async () => {
          const result = await addNoteAction({ photoId, text: words, colour, x: pin.x, y: pin.y });
          setFailed(!result.ok);
          if (result.ok) {
            setText("");
            onDone();
          }
        });
      }}
    >
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeText")}
        aria-label={t("placeText")}
        maxLength={600}
        className="min-w-0 flex-1"
      />
      <Select
        value={colour}
        onChange={(e) => setColour(e.target.value as NoteColour)}
        aria-label={t("colour")}
        className="w-36"
      >
        {NOTE_COLOURS.map((c) => (
          <option key={c} value={c}>
            {tc(c)}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="primary" disabled={pending || !text.trim()}>
        {t("add")}
      </Button>
      <button
        type="button"
        onClick={onDone}
        aria-label={t("placeCancel")}
        className="rounded p-1 text-slate hover:bg-sand hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
      {failed && <p className="basis-full text-[12px] text-danger">{t("saveFailed")}</p>}
    </form>
  );
}
