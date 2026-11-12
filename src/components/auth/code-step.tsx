"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { secondFactorAction } from "@/actions/auth";
import { Button, Hint, Input, Label } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** The second step of signing in: the code from the app, or a recovery code. */
export function CodeStep({ onExpired }: { onExpired: () => void }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [code, setCode] = useState("");

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await secondFactorAction({ code });
          if (result.ok) {
            router.push("/");
            router.refresh();
            return;
          }
          if (result.error === "expired") onExpired();
          setStatus({ kind: "error", text: t(`errors.${result.error}`) });
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-code">{t("code")}</Label>
        <Input
          id="auth-code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="text"
          maxLength={20}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-describedby="auth-code-hint"
        />
        <Hint id="auth-code-hint">{t("codeHint")}</Hint>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {t("codeSubmit")}
      </Button>
      <StatusMessage status={status} />
    </form>
  );
}
