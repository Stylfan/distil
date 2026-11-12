"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { passkeyLoginAction, passkeyOptionsAction } from "@/actions/auth";
import { Button } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** Signing in with a passkey: no e-mail, no password, no code. */
export function PasskeyLogin() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const begun = await passkeyOptionsAction();
            if (!begun) return setStatus({ kind: "error", text: t("errors.tooMany") });
            let response;
            try {
              response = await startAuthentication({
                optionsJSON: begun.options as PublicKeyCredentialRequestOptionsJSON,
              });
            } catch {
              // Cancelled in the browser's own dialog, or no passkey on this device.
              return setStatus({ kind: "error", text: t("errors.passkeyCancelled") });
            }
            const result = await passkeyLoginAction({ token: begun.token, response });
            if (!result.ok) return setStatus({ kind: "error", text: t(`errors.${result.error}`) });
            router.push("/");
            router.refresh();
          })
        }
      >
        <KeyRound aria-hidden className="size-4" />
        {t("passkeyLogin")}
      </Button>
      <StatusMessage status={status} />
    </div>
  );
}
