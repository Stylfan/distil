import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { RequestList } from "@/components/account/request-list";
import { PageHeader } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { limits } from "@/domain/limits";
import { listRequests } from "@/services/requests";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("title") };
}

/** The operator's page: the requests for more photos. Anyone else gets a page that is not there. */
export default async function AdminPage() {
  const user = await requireUser();
  if (!user.isAdmin) notFound();
  const t = await getTranslations("admin");
  const requests = await listRequests(getDb(), user.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-col gap-3">
        <p className="text-[13px] leading-relaxed text-slate">{t("lead")}</p>
        <RequestList requests={requests} approved={limits().approvedAllowance} />
      </div>
    </div>
  );
}
