"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { NoteColour } from "@/db/schema";
import { newId, type Theme } from "@/domain/outline";
import { NOTE_EDGE, NOTE_FILL } from "@/components/workshop/colours";
import { EditableList } from "./editable-list";

export type NoteChip = { text: string; colour: NoteColour };

/**
 * One theme: its name, a line or two on it, its points, and the notes from
 * the wall it was made from, as small post-its, so the facilitator can see
 * that nothing was put in the wrong place.
 */
export function ThemeCard({
  theme,
  number,
  notes,
  onChange,
  onMove,
  onRemove,
  first,
  last,
}: {
  theme: Theme;
  number: number;
  notes: Map<string, NoteChip>;
  onChange: (next: Theme) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  first: boolean;
  last: boolean;
}) {
  const t = useTranslations("outline");
  const points = theme.points.map((text, i) => ({ id: `${theme.id}-${i}`, text }));
  const chips = theme.noteIds.map((id) => notes.get(id)).filter((n): n is NoteChip => !!n);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-4">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 text-[12px] font-semibold text-slate tabular">{number}</span>
        <input
          value={theme.title}
          onChange={(e) => onChange({ ...theme, title: e.target.value })}
          aria-label={t("themeTitle", { number })}
          className="flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-semibold text-ink hover:border-hairline focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          disabled={first}
          onClick={() => onMove(-1)}
          aria-label={t("moveUp")}
          className="rounded p-1 text-slate hover:bg-sand disabled:opacity-30"
        >
          <ArrowUp className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          disabled={last}
          onClick={() => onMove(1)}
          aria-label={t("moveDown")}
          className="rounded p-1 text-slate hover:bg-sand disabled:opacity-30"
        >
          <ArrowDown className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeTheme", { number })}
          className="rounded p-1 text-slate/50 hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
      <textarea
        value={theme.summary}
        rows={1}
        onChange={(e) => onChange({ ...theme, summary: e.target.value })}
        aria-label={t("themeSummary", { number })}
        placeholder={t("themeSummaryPlaceholder")}
        className="resize-none overflow-hidden rounded border border-transparent bg-transparent px-1.5 py-1 text-[14px] leading-relaxed text-slate [field-sizing:content] hover:border-hairline focus:border-ink focus:bg-surface focus:outline-none"
      />
      <EditableList
        items={points}
        onChange={(next) => onChange({ ...theme, points: next.map((p) => p.text) })}
        onAdd={() => ({ id: newId("pt"), text: "" })}
        addLabel={t("addPoint")}
        itemLabel={(n) => t("point", { number: n })}
      />
      {chips.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-hairline-soft pt-2">
          <p className="text-[12px] text-slate">{t("fromNotes", { count: chips.length })}</p>
          <ul className="flex flex-wrap gap-1.5">
            {chips.map((n, i) => (
              <li
                key={i}
                className="max-w-[14rem] truncate rounded-sm border px-2 py-1 text-[12px] text-ink"
                style={{
                  background: n.colour === "none" ? "var(--color-sand)" : NOTE_FILL[n.colour],
                  borderColor: NOTE_EDGE[n.colour],
                }}
                title={n.text}
              >
                {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
