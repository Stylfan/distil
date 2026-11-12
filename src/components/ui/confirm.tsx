"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "./controls";

/**
 * Nothing destructive happens on one click. A native dialog: it traps
 * focus, closes on Escape and is read out as a dialog by screen readers,
 * and it says in words what will be lost.
 */
export function ConfirmButton({
  label,
  question,
  detail,
  confirmLabel,
  cancelLabel,
  onConfirm,
  icon = false,
  item = false,
}: {
  label: string;
  question: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** A small bin instead of a button, for rows and headers; the label becomes its name. */
  icon?: boolean;
  /** A line in a menu instead of a button. */
  item?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      {item ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => ref.current?.showModal()}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] text-danger hover:bg-danger-soft"
        >
          <Trash2 className="size-3.5" aria-hidden />
          {label}
        </button>
      ) : icon ? (
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={() => ref.current?.showModal()}
          className="rounded p-1 text-slate/60 hover:bg-danger-soft hover:text-danger focus-visible:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      ) : (
        <Button variant="danger" size="sm" onClick={() => ref.current?.showModal()}>
          {label}
        </Button>
      )}
      <dialog
        ref={ref}
        className="m-auto max-w-md rounded-lg border border-hairline bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 className="text-lg font-semibold">{question}</h2>
        {detail && <p className="mt-2 text-sm leading-relaxed text-slate">{detail}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => ref.current?.close()} autoFocus>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              ref.current?.close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
