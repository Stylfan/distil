"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ellipsis, Pencil } from "lucide-react";
import { deleteWorkshopAction, renameWorkshopAction } from "@/actions/workshops";
import { Button, Input, Label } from "@/components/ui/controls";
import { ConfirmButton } from "@/components/ui/confirm";

/**
 * The workshop's own actions, behind one "⋯" in its header: change its name
 * or day, or delete it with everything (asked first).
 */
export function WorkshopMenu({ id, name, heldOn }: { id: string; name: string; heldOn: string }) {
  const t = useTranslations("workshops");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ name, heldOn });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  // Closes when the pointer goes down anywhere else, or on Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={menu} className="relative">
      <Button
        size="sm"
        variant="ghost"
        aria-label={t("actions")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Ellipsis className="size-4" aria-hidden />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col rounded-lg border border-hairline bg-surface p-1 shadow-[0_8px_24px_rgba(31,45,51,0.12)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              dialog.current?.showModal();
            }}
            className="flex items-center gap-2 rounded px-3 py-2 text-left text-[13px] text-ink hover:bg-sand"
          >
            <Pencil className="size-3.5" aria-hidden />
            {t("edit")}
          </button>
          <span className="my-1 h-px bg-hairline" aria-hidden />
          <ConfirmButton
            item
            label={t("delete")}
            question={t("deleteQuestion", { name })}
            detail={t("deleteDetail")}
            confirmLabel={t("deleteConfirm")}
            cancelLabel={tc("cancel")}
            onConfirm={() =>
              start(async () => {
                const result = await deleteWorkshopAction(id);
                if (result.ok) router.replace("/");
              })
            }
          />
        </div>
      )}
      <dialog
        ref={dialog}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-hairline bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await renameWorkshopAction({ id, ...draft });
              if (result.ok) {
                dialog.current?.close();
                router.refresh();
              } else setError(te(result.error));
            });
          }}
        >
          <h2 className="text-lg font-semibold">{t("edit")}</h2>
          <Label htmlFor="edit-name">{t("name")}</Label>
          <Input
            id="edit-name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
            maxLength={120}
          />
          <Label htmlFor="edit-date">{t("heldOn")}</Label>
          <Input
            id="edit-date"
            type="date"
            value={draft.heldOn}
            onChange={(e) => setDraft({ ...draft, heldOn: e.target.value })}
            required
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => dialog.current?.close()}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
