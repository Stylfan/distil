"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A list of short texts edited in place: each line its own field that
 * grows with its text, a bin to remove it, and a line to add one more.
 * Used for points, patterns, recommendations and open points.
 */
export function EditableList<T extends { id: string; text: string }>({
  items,
  onChange,
  onAdd,
  addLabel,
  itemLabel,
  extra,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  onAdd: () => T;
  addLabel: string;
  itemLabel: (n: number) => string;
  /** Something at the end of a row, e.g. "Behold" on a recommendation. */
  extra?: (item: T, set: (next: T) => void) => React.ReactNode;
}) {
  const t = useTranslations("outline");
  const set = (i: number, next: T) => onChange(items.map((it, j) => (j === i ? next : it)));
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col gap-0.5">
        {items.map((item, i) => (
          <li key={item.id} className="group flex items-start gap-2">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-slate/50" aria-hidden />
            <textarea
              value={item.text}
              rows={1}
              onChange={(e) => set(i, { ...item, text: e.target.value })}
              aria-label={itemLabel(i + 1)}
              className={cn(
                "w-full resize-none overflow-hidden rounded border border-transparent bg-transparent px-1.5 py-1 text-[14px] leading-snug text-ink [field-sizing:content]",
                "hover:border-hairline focus:border-ink focus:bg-surface focus:outline-none",
              )}
            />
            {extra?.(item, (next) => set(i, next))}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={t("remove", { item: itemLabel(i + 1) })}
              title={t("remove", { item: itemLabel(i + 1) })}
              className="mt-1 rounded p-1 text-slate/50 hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, onAdd()])}
        className="flex items-center gap-1.5 self-start rounded px-1.5 py-1 text-[13px] text-slate hover:bg-sand hover:text-ink"
      >
        <Plus className="size-3.5" aria-hidden />
        {addLabel}
      </button>
    </div>
  );
}
