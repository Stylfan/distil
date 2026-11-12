"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown, MessageSquareText } from "lucide-react";
import { hasContext, type WorkshopContext } from "@/domain/context";
import { MakeOutline } from "@/components/outline/outline-run";
import { buttonClass } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { ContextPanel, summary } from "./context-panel";
import { PhoneLink } from "./phone-link";
import { PhotoIntake } from "./photo-intake";

/**
 * Everything to do with the material, in one calm line on a computer, as on
 * the presentation: what the facilitator told Distil about the workshop
 * (opens below), adding photos (or dropping them anywhere on the page) or
 * from the phone, and the next step. One quiet line under it with the count.
 */
export function MaterialToolbar({
  workshopId,
  context,
  status,
  next,
}: {
  workshopId: string;
  context: WorkshopContext | null;
  /** "6 billeder · 6 at tjekke". */
  status: string;
  /** The next step: make the outline, go to it, or nothing yet. */
  next: "make" | "open" | null;
}) {
  const t = useTranslations("context");
  const tw = useTranslations("workshop");
  const [open, setOpen] = useState(!hasContext(context));
  const told = hasContext(context);

  return (
    <div className="hidden flex-col gap-2 md:flex">
      <div className="flex items-center gap-3 rounded-lg border border-hairline bg-white px-3 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-hairline bg-white px-3 text-left text-[13px] hover:border-slate"
        >
          <MessageSquareText className="size-4 shrink-0 text-bronze" aria-hidden />
          <span className="shrink-0 font-medium text-ink">{t("short")}</span>
          <span className="min-w-0 truncate text-slate">
            {told ? summary(context!, t("none")) : t("shortLead")}
          </span>
          <ChevronDown
            className={cn("ml-auto size-3.5 shrink-0 text-slate transition", open && "rotate-180")}
            aria-hidden
          />
        </button>
        <span className="h-6 w-px bg-hairline" aria-hidden />
        <PhotoIntake workshopId={workshopId} mode="toolbar" />
        <PhoneLink workshopId={workshopId} inToolbar />
        {next === "make" && <MakeOutline workshopId={workshopId} quiet />}
        {next === "open" && (
          <Link href={`/workshops/${workshopId}/disposition`} className={buttonClass("secondary")}>
            {tw("toOutline")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <p className="text-[12px] text-slate">{status}</p>
      <ContextPanel workshopId={workshopId} context={context} open={open} headless />
    </div>
  );
}
