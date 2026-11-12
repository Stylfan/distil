import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import { currentUser } from "@/auth/session";
import { AuthForm } from "@/components/auth/auth-form";
import { SectionLabel } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { operator } from "@/lib/operator";
import { signupOpen } from "@/services/users";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default async function RegisterPage() {
  if (await currentUser()) redirect("/");
  const db = getDb();
  const t = await getTranslations("auth");
  const first = await signupOpen(db, "closed");
  if (!(await signupOpen(db))) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{t("closedTitle")}</h1>
        <p className="text-sm leading-relaxed text-slate">{t("closedBody")}</p>
        <Link href="/login" className="text-[13px] underline underline-offset-4">
          {t("toLogin")}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SectionLabel>{t("registerLabel")}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{t("registerTitle")}</h1>
        {first && <p className="text-sm leading-relaxed text-slate">{t("firstAccount")}</p>}
      </div>
      <AuthForm mode="register" minPassword={MIN_PASSWORD_LENGTH} />
      {operator() && (
        <p className="text-[12px] leading-relaxed text-slate">
          {(await getTranslations("legal")).rich("registerNote", {
            terms: (chunks) => (
              <Link href="/vilkaar" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privatliv" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </div>
  );
}
