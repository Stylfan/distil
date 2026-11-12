"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { deleteWorkshopAction, renameWorkshopAction } from "@/actions/workshops";
import { Button, Input, Label } from "@/components/ui/controls";
import { ConfirmButton } from "@/components/ui/confirm";

/** The workshop's own actions in its header: change its name or day, or delete it with everything. */
export function WorkshopMenu({ id, name, heldOn }: { id: string; name: string; heldOn: string }) {
  const t = useTranslations("workshops");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ name, heldOn });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => dialog.current?.showModal()}>
        <Pencil className="size-3.5" aria-hidden />
        {t("edit")}
      </Button>
      <ConfirmButton
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
    </>
  );
}
