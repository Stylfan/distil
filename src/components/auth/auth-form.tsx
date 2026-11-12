"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { loginAction, registerAction } from "@/actions/auth";
import { Button, Hint, Input, Label } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { CodeStep } from "./code-step";
import { PasskeyLogin } from "./passkey-login";

/** Sign in, or sign up when the installation allows it. */
export function AuthForm({
  mode,
  minPassword,
}: {
  mode: "login" | "register";
  minPassword: number;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const register = mode === "register";

  if (step === "code") return <CodeStep onExpired={() => setStep("password")} />;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = register
            ? await registerAction({ email, name, password })
            : await loginAction({ email, password });
          if (!result.ok) return setStatus({ kind: "error", text: t(`errors.${result.error}`) });
          if (result.next === "code") return setStep("code");
          router.push("/");
          router.refresh();
        });
      }}
    >
      {register && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-name">{t("name")}</Label>
          <Input
            id="auth-name"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-email">{t("email")}</Label>
        <Input
          id="auth-email"
          type="email"
          required
          autoComplete="email"
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-password">{t("password")}</Label>
        <Input
          id="auth-password"
          type="password"
          required
          minLength={register ? minPassword : undefined}
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={200}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={register ? "auth-password-hint" : undefined}
        />
        {register && (
          <Hint id="auth-password-hint">{t("passwordHint", { count: minPassword })}</Hint>
        )}
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {register ? t("registerSubmit") : t("loginSubmit")}
      </Button>
      <StatusMessage status={status} />
      {!register && (
        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <p className="text-[13px] text-slate">{t("or")}</p>
          <PasskeyLogin />
        </div>
      )}
      <p className="text-[13px] text-slate">
        {register ? (
          <Link href="/login" className="underline underline-offset-4 hover:text-ink">
            {t("toLogin")}
          </Link>
        ) : (
          <Link href="/register" className="underline underline-offset-4 hover:text-ink">
            {t("toRegister")}
          </Link>
        )}
      </p>
    </form>
  );
}
