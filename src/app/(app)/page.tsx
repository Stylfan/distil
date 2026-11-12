import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { RequestMore } from "@/components/account/request-more";
import { NewWorkshopForm } from "@/components/workshop/new-workshop-form";
import { PageHeader } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { formatDay } from "@/lib/dates";
import { photosLeft } from "@/services/limits";
import { listWorkshops } from "@/services/workshops";

export const dynamic = "force-dynamic";

/** The front page: a new workshop on top, then every workshop, the latest first. */
export default async function HomePage() {
  const t = await getTranslations("workshops");
  const user = await requireUser();
  const [workshops, left] = await Promise.all([
    withUser(user.id, (tx) => listWorkshops(tx, user.id)),
    photosLeft(getDb(), user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-col gap-6">
        <section className="flex flex-col gap-2" aria-labelledby="new-title">
          <h2 id="new-title" className="text-[15px] font-semibold">
            {t("new")}
          </h2>
          <NewWorkshopForm autoFocus={workshops.length === 0} />
          <p className="text-[13px] text-slate">{t("photosLeft", { count: left })}</p>
          {/* Running low: ask the operator for more. A demo visit cannot; it is gone in a day. */}
          {left <= 3 && user.demoExpiresAt === null && (
            <RequestMore requestedAt={user.moreRequestedAt} />
          )}
        </section>

        {workshops.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline p-6 text-[14px] leading-relaxed text-slate">
            {t("empty")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline-soft rounded-lg border border-hairline bg-surface">
            {workshops.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/workshops/${w.id}`}
                  className="group flex items-center gap-4 px-4 py-3.5 hover:bg-sand/40"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium text-ink">{w.name}</span>
                    <span className="text-[13px] text-slate">
                      {formatDay(w.heldOn)} ·{" "}
                      {t("counts", { photos: w.photoCount, notes: w.noteCount })}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-slate transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
