"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, RotateCcw } from "lucide-react";
import { undoOutlineAction } from "@/actions/outlines";
import { StoryAsk } from "@/components/deck/story-panel";
import { Button, buttonClass } from "@/components/ui/controls";
import { useRun } from "./outline-run";

/**
 * Everything to do with the outline, in one calm line on a computer, as on
 * the presentation: ask Distil for a change in plain words (with making it
 * again behind "?"), undo Distil's last change, and go on to the
 * presentation. One quiet line under it with the count.
 */

const SUGGESTIONS = ["merge", "shorter", "agreed"] as const;

export function OutlineToolbar({
  workshopId,
  canUndo,
  status,
}: {
  workshopId: string;
  canUndo: boolean;
  /** "8 temaer · 129 sedler". */
  status: string;
}) {
  const t = useTranslations("outline");
  const tb = useTranslations("outline.bar");
  const router = useRouter();
  const { go, pending, error } = useRun(workshopId);
  const [undoing, startUndo] = useTransition();

  return (
    <div className="hidden flex-col gap-2 md:flex">
      <div className="flex items-center gap-3 rounded-lg border border-hairline bg-white px-3 py-2.5">
        <StoryAsk
          words="outline.bar"
          suggestions={SUGGESTIONS}
          telling={pending}
          onAsk={(request, done) => go(request, done)}
          extra={
            <button
              type="button"
              disabled={pending}
              onClick={() => go(null)}
              className="self-start text-[12px] text-ink underline underline-offset-4 hover:text-slate"
            >
              {t("remake")}
            </button>
          }
        />
        {canUndo && (
          <Button
            disabled={pending || undoing}
            onClick={() =>
              startUndo(async () => {
                await undoOutlineAction(workshopId);
                router.refresh();
              })
            }
          >
            <RotateCcw className="size-4" aria-hidden />
            {tb("undo")}
          </Button>
        )}
        <Link href={`/workshops/${workshopId}/praesentation`} className={buttonClass("secondary")}>
          {tb("toDeck")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <p className="text-[12px] text-slate">
        {status}
        {pending && <span className="text-ink"> · {tb("working")}</span>}
        {error && <span className="text-danger"> · {error}</span>}
      </p>
    </div>
  );
}
