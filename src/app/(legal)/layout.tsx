import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/ui/wordmark";

/** The privacy policy and the terms: open to everyone, signed in or not, in one reading column. */
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("legal");
  return (
    <main id="content" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-8 py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-ink" aria-label="Distil">
          <Wordmark />
        </Link>
        <nav className="flex gap-4 text-[13px] text-slate">
          <Link href="/privatliv" className="hover:text-ink">
            {t("privacyLink")}
          </Link>
          <Link href="/vilkaar" className="hover:text-ink">
            {t("termsLink")}
          </Link>
        </nav>
      </div>
      {children}
      <Link href="/" className="text-[13px] text-slate underline underline-offset-4 hover:text-ink">
        {t("backToStart")}
      </Link>
    </main>
  );
}
