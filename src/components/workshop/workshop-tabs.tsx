import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";

/** The steps of a workshop on the computer: the material (context, agenda, photos), the outline, the presentation. */
export async function WorkshopTabs({
  workshopId,
  current,
}: {
  workshopId: string;
  current: "transcript" | "outline" | "deck";
}) {
  const t = await getTranslations("workshop");
  const tabs = [
    { key: "transcript", href: `/workshops/${workshopId}`, label: t("tabTranscript") },
    { key: "outline", href: `/workshops/${workshopId}/disposition`, label: t("tabOutline") },
    { key: "deck", href: `/workshops/${workshopId}/praesentation`, label: t("tabDeck") },
  ] as const;
  return (
    <nav
      aria-label={t("steps")}
      className="hidden gap-1 border-b border-hairline md:flex print:hidden"
    >
      {tabs.map((tab, i) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={current === tab.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-[14px]",
            current === tab.key
              ? "border-ink font-medium text-ink"
              : "border-transparent text-slate hover:text-ink",
          )}
        >
          <span className="mr-1.5 text-[12px] text-slate tabular">{i + 1}</span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
