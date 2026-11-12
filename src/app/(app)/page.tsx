import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { RequestMore } from "@/components/account/request-more";
import { NewWorkshopForm } from "@/components/workshop/new-workshop-form";
import { WorkshopRows } from "@/components/workshop/workshop-rows";
import { PageHeader } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
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
          <NewWorkshopForm autoFocus={workshops.every((w) => w.archivedAt !== null)} />
          <p className="text-[13px] text-slate">{t("photosLeft", { count: left })}</p>
          {/* Running low: ask the operator for more. A demo visit cannot; it is gone in a day. */}
          {left <= 3 && user.demoExpiresAt === null && (
            <RequestMore requestedAt={user.moreRequestedAt} />
          )}
        </section>

        <WorkshopRows workshops={workshops} />
      </div>
    </div>
  );
}
