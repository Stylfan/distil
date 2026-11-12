import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { sourceUrl } from "@/lib/demo-mode";

/**
 * The line over every page of a demo visit: it is a demo, when it is
 * deleted, not to type real data, and where to get the code.
 */
export async function DemoBanner({ expiresAt }: { expiresAt: number }) {
  const t = await getTranslations("demoVisit");
  const at = new Date(expiresAt);
  const zone = { timeZone: "Europe/Copenhagen" } as const;
  const day = at.toLocaleDateString("da-DK", { ...zone, weekday: "long" });
  const time = at.toLocaleTimeString("da-DK", { ...zone, hour: "2-digit", minute: "2-digit" });
  const when = `${day} kl. ${time}`;
  return (
    <div
      role="note"
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-warning/40 bg-warning-soft px-4 py-2.5 text-[13px] text-ink print:hidden"
    >
      <span>{t("banner", { when })}</span>
      <span className="flex-1" />
      <a
        href={sourceUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        {t("bannerSource")}
      </a>
      <Link href="/account#leave" className="underline underline-offset-4">
        {t("end")}
      </Link>
    </div>
  );
}
