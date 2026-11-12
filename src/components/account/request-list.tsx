"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { answerRequestAction } from "@/actions/requests";
import { Button } from "@/components/ui/controls";
import type { MoreRequest } from "@/services/requests";

/** The operator's list of requests for more photos: who, how far they have got, why, and yes or no. */
export function RequestList({ requests, approved }: { requests: MoreRequest[]; approved: number }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, start] = useTransition();

  if (requests.length === 0) {
    return <p className="text-[14px] text-slate">{t("none")}</p>;
  }
  const answer = (userId: string, approve: boolean) =>
    start(async () => {
      await answerRequestAction({ userId, approve });
      router.refresh();
    });

  return (
    <ul className="flex flex-col divide-y divide-hairline-soft rounded-lg border border-hairline bg-surface">
      {requests.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-medium text-ink">{r.name || r.email}</span>
            {r.name && <span className="text-[12px] text-slate">{r.email}</span>}
            <span className="text-[12px] text-slate">
              {t("usage", { read: r.photosRead, allowance: r.photoAllowance })} ·{" "}
              {new Date(r.requestedAt).toLocaleDateString("da-DK", {
                timeZone: "Europe/Copenhagen",
              })}
            </span>
            {r.note && <p className="mt-1 text-[13px] leading-relaxed text-ink">»{r.note}«</p>}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={pending}
              onClick={() => answer(r.id, true)}
            >
              {t("approve", { count: approved })}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => answer(r.id, false)}
            >
              {t("decline")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
