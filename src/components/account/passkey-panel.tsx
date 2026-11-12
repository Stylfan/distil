"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { passkeyBeginAction, passkeyFinishAction, passkeyRemoveAction } from "@/actions/factors";
import { ConfirmButton } from "@/components/ui/confirm";
import { Button, Input, Label } from "@/components/ui/controls";
import { SettingRow } from "@/components/ui/layout";
import { StatusMessage, useStatus } from "@/components/ui/status";

export type PasskeyRow = { id: string; name: string; createdAt: number; lastUsedAt: number | null };

/** The account's passkeys: add one on this device, see when each was used, remove one. */
export function PasskeyPanel({ passkeys }: { passkeys: PasskeyRow[] }) {
  const t = useTranslations("account.passkeys");
  const te = useTranslations("account.errors");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [name, setName] = useState("");
  const add = () =>
    startTransition(async () => {
      const begun = await passkeyBeginAction();
      if (!begun.ok) return setStatus({ kind: "error", text: te(begun.error) });
      let response;
      try {
        response = await startRegistration({
          optionsJSON: begun.data.options as PublicKeyCredentialCreationOptionsJSON,
        });
      } catch {
        return setStatus({ kind: "error", text: te("cancelled") });
      }
      const result = await passkeyFinishAction({ token: begun.data.token, name, response });
      if (!result.ok) return setStatus({ kind: "error", text: te(result.error) });
      setName("");
      setStatus({ kind: "ok", text: t("addedNow") });
      router.refresh();
    });
  const date = (ms: number) => format.dateTime(new Date(ms), { dateStyle: "medium" });

  return (
    <>
      <SettingRow
        label={t("title")}
        hint={
          <>
            {passkeys.length === 0 ? t("none") : t("count", { count: passkeys.length })}
            <StatusMessage status={status} />
          </>
        }
      >
        <form
          className="flex flex-wrap items-center gap-2 sm:justify-end"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Label htmlFor="passkey-name" className="sr-only">
            {t("nameLabel")}
          </Label>
          <Input
            id="passkey-name"
            maxLength={60}
            className="w-44"
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {t("add")}
          </Button>
        </form>
      </SettingRow>
      {passkeys.length > 0 && (
        <ul className="-mt-2 flex flex-col divide-y divide-hairline-soft border-b border-hairline-soft pb-2">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-2 pl-4">
              <div className="flex flex-col">
                <span className="font-medium">{p.name || t("unnamed")}</span>
                <span className="text-[13px] text-slate">
                  {t("added", { date: date(p.createdAt) })}
                  {p.lastUsedAt && ` · ${t("used", { date: date(p.lastUsedAt) })}`}
                </span>
              </div>
              <ConfirmButton
                label={t("remove")}
                question={t("removeQuestion", { name: p.name || t("unnamed") })}
                detail={t("removeDetail")}
                confirmLabel={t("remove")}
                cancelLabel={t("cancel")}
                onConfirm={() =>
                  startTransition(async () => {
                    const result = await passkeyRemoveAction({ id: p.id });
                    if (!result.ok) return setStatus({ kind: "error", text: te(result.error) });
                    router.refresh();
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
