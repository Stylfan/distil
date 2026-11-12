"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteAccountAction } from "@/actions/account";
import { Button, Input, Label } from "@/components/ui/controls";

/**
 * Deleting the account. A dialog that says what will be lost and asks for
 * the e-mail address before the button works.
 */
export function DeleteAccount({ email }: { email: string }) {
  const t = useTranslations("account.delete");
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === email;

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => ref.current?.showModal()}>
        {t("open")}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="delete-account-title"
        className="m-auto max-w-md rounded-lg border border-hairline bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!matches) return;
            startTransition(async () => {
              const result = await deleteAccountAction({ email: typed });
              if (result.ok) {
                router.push("/register");
                router.refresh();
              } else setError(t(`errors.${result.error}`));
            });
          }}
        >
          <h2 id="delete-account-title" className="text-lg font-semibold">
            {t("question")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate">{t("detail")}</p>
          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="delete-account-email">{t("confirmLabel", { email })}</Label>
            <Input
              id="delete-account-email"
              type="email"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => ref.current?.close()} autoFocus>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={!matches || pending}>
              {t("confirm")}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
