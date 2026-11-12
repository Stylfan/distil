"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteNoteAction, updateNoteAction } from "@/actions/notes";
import { NOTE_COLOURS, type Note, type NoteColour } from "@/db/schema";
import { cn } from "@/lib/cn";
import { NOTE_EDGE, NOTE_FILL } from "./colours";

/**
 * One note as read: its number on the photo, its colour, and the text,
 * which is edited in place and saved when the field is left. A note Distil
 * was unsure of is amber and offers the other readings it considered.
 */
export function NoteRow({
  note,
  number,
  active,
  onActive,
}: {
  note: Note;
  number: number;
  active: boolean;
  onActive: (id: string | null) => void;
}) {
  const t = useTranslations("review");
  const tc = useTranslations("colours");
  const router = useRouter();
  const [text, setText] = useState(note.text);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const [votes, setVotes] = useState(String(note.votes));
  const save = (change: { text?: string; colour?: NoteColour; votes?: number }) =>
    start(async () => {
      const result = await updateNoteAction({ id: note.id, ...change });
      setFailed(!result.ok);
      if (result.ok) router.refresh();
    });

  return (
    <li
      onMouseEnter={() => onActive(note.id)}
      onMouseLeave={() => onActive(null)}
      className={cn(
        "flex items-start gap-2 rounded-md border px-2 py-1.5 transition-colors",
        note.unsure ? "border-warning/50 bg-warning-soft/60" : "border-transparent",
        active && "border-ink/40 bg-sand/60",
      )}
    >
      <span className="mt-1.5 w-5 shrink-0 text-right text-[12px] font-semibold text-slate tabular">
        {number}
      </span>
      <label className="relative mt-1 shrink-0">
        <span className="sr-only">{t("colour")}</span>
        <span
          className="block size-5 rounded-sm border"
          style={{ background: NOTE_FILL[note.colour], borderColor: NOTE_EDGE[note.colour] }}
          aria-hidden
        />
        <select
          value={note.colour}
          onChange={(e) => save({ colour: e.target.value as NoteColour })}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {NOTE_COLOURS.map((c) => (
            <option key={c} value={c}>
              {tc(c)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <textarea
          id={`note-${note.id}`}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => onActive(note.id)}
          onBlur={() => {
            const next = text.trim();
            if (next && next !== note.text) save({ text: next });
            else setText(note.text);
          }}
          aria-label={t("noteText", { number })}
          className={cn(
            "w-full resize-none overflow-hidden rounded border [field-sizing:content] border-transparent bg-transparent px-1.5 py-1 text-[14px] leading-snug text-ink hover:border-hairline focus:border-ink focus:bg-surface focus:outline-none",
            note.kind === "heading" && "font-semibold",
            note.kind === "drawing" && "text-slate italic",
          )}
        />
        {note.unsure && note.alternatives.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 px-1.5 text-[12px] text-warning">
            {t("orMaybe")}
            {note.alternatives.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setText(a);
                  save({ text: a });
                }}
                className="rounded-full border border-warning/40 bg-surface px-2 py-0.5 text-ink hover:border-ink"
              >
                {a}
              </button>
            ))}
          </div>
        )}
        {note.unsure && note.alternatives.length === 0 && (
          <span className="px-1.5 text-[12px] text-warning">{t("unsure")}</span>
        )}
        {failed && <span className="px-1.5 text-[12px] text-danger">{t("saveFailed")}</span>}
      </div>
      {/* Dots the participants put on the note: read by Distil, set here when it miscounted. */}
      <label
        className={cn(
          "mt-1 flex shrink-0 items-center gap-0.5 rounded px-1 text-[12px] tabular",
          note.votes > 0 ? "text-bronze-deep" : "text-slate/50",
        )}
        title={t("votes")}
      >
        <span aria-hidden>●</span>
        <span className="sr-only">{t("votesFor", { number })}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={votes}
          onChange={(e) => setVotes(e.target.value)}
          onBlur={() => {
            const next = Math.max(0, Math.min(99, Math.round(Number(votes) || 0)));
            setVotes(String(next));
            if (next !== note.votes) save({ votes: next });
          }}
          className="w-7 [appearance:textfield] bg-transparent text-center focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deleteNoteAction(note.id);
            if (result.ok) router.refresh();
            else setFailed(true);
          })
        }
        aria-label={t("deleteNote", { number })}
        title={t("deleteNote", { number })}
        className="mt-1 rounded p-1 text-slate/60 hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}
