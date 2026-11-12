import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { WorkshopSummary } from "@/services/workshops";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { WorkshopMenu } from "./workshop-menu";

/**
 * The workshops on the front page: the ones in use, each with its "⋯" for
 * renaming, archiving and deleting; the archived ones folded away below,
 * where they can be opened, taken back or deleted.
 */
export async function WorkshopRows({ workshops }: { workshops: WorkshopSummary[] }) {
  const t = await getTranslations("workshops");
  const active = workshops.filter((w) => w.archivedAt === null);
  const archived = workshops.filter((w) => w.archivedAt !== null);

  const rows = (list: WorkshopSummary[], quiet: boolean) => (
    <ul className="flex flex-col divide-y divide-hairline-soft rounded-lg border border-hairline bg-surface">
      {list.map((w) => (
        <li key={w.id} className="group flex items-center gap-2 pr-2 hover:bg-sand/40">
          <Link
            href={`/workshops/${w.id}`}
            className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "truncate text-[15px] font-medium",
                  quiet ? "text-slate" : "text-ink",
                )}
              >
                {w.name}
              </span>
              <span className="text-[13px] text-slate">
                {formatDay(w.heldOn)} · {t("counts", { photos: w.photoCount, notes: w.noteCount })}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-slate transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
              aria-hidden
            />
          </Link>
          <WorkshopMenu
            id={w.id}
            name={w.name}
            heldOn={w.heldOn}
            archived={w.archivedAt !== null}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4">
      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline p-6 text-[14px] leading-relaxed text-slate">
          {t("empty")}
        </p>
      ) : (
        rows(active, false)
      )}
      {archived.length > 0 && (
        <details className="group/archive flex flex-col gap-2">
          <summary className="cursor-pointer list-none text-[13px] text-slate hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block transition group-open/archive:rotate-90">›</span>
            {t("archived", { count: archived.length })}
          </summary>
          <div className="mt-2">{rows(archived, true)}</div>
        </details>
      )}
    </div>
  );
}
