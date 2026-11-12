import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/ui/wordmark";
import { operator } from "@/lib/operator";

/**
 * The sign-in pages: the mark, one quiet panel, and under it the privacy
 * policy and terms when someone runs this installation for others.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("legal");
  const op = operator();
  return (
    <main
      id="content"
      className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-10 sm:px-8"
    >
      <span className="text-ink">
        <Wordmark />
      </span>
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-surface p-6 sm:p-8">
        {children}
      </div>
      <span className="-mt-6 text-[12px] text-slate/80">
        {(await getTranslations("app"))("maker")}
      </span>
      {op && (
        <nav className="flex gap-4 text-[12px] text-slate">
          <Link href="/privatliv" className="hover:text-ink">
            {t("privacyLink")}
          </Link>
          <Link href="/vilkaar" className="hover:text-ink">
            {t("termsLink")}
          </Link>
        </nav>
      )}
    </main>
  );
}
