"use client";

import { createContext, useContext } from "react";
import type { DeckRef } from "@/domain/deck-edit";
import { cn } from "@/lib/cn";

/**
 * Text on a slide that can be changed where it stands. Outside editing
 * (and always in the PDF) it is plain text; while editing, it is a field
 * the size of the text, saved when it is left.
 */

type EditContext = { editing: boolean; save: (ref: DeckRef, value: string) => void };

export const DeckEditContext = createContext<EditContext>({
  editing: false,
  save: () => undefined,
});

export function Editable({
  value,
  at,
  className,
  multiline = false,
}: {
  value: string;
  at: DeckRef;
  className?: string;
  multiline?: boolean;
}) {
  const { editing, save } = useContext(DeckEditContext);
  if (!editing) return <span className={className}>{value}</span>;
  return (
    <span
      role="textbox"
      aria-multiline={multiline}
      contentEditable
      suppressContentEditableWarning
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) save(at, next);
      }}
      className={cn(
        "rounded-sm outline-none [box-shadow:0_0_0_1px_rgba(168,142,110,0.45)] hover:bg-[#F6ECDC]/60 focus:bg-[#F6ECDC] focus:[box-shadow:0_0_0_2px_#A88E6E] print:shadow-none",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** An editable value that shows a dash when empty and not being edited, as "who" and "when" do. */
export function EditableOr({ value, at }: { value: string; at: DeckRef }) {
  const { editing } = useContext(DeckEditContext);
  if (!editing && !value) return <span>–</span>;
  return (
    <Editable
      value={value}
      at={at}
      className={editing && !value ? "inline-block min-w-[2em]" : undefined}
    />
  );
}
