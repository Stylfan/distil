"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RotateCcw, Send, Sparkles } from "lucide-react";
import { undoOutlineAction } from "@/actions/outlines";
import { Button, Textarea } from "@/components/ui/controls";
import { requestOutline } from "./request-outline";

/** Shown while Distil works, so a wait of many seconds reads as work, not as a hang. */
function Working() {
  const t = useTranslations("outline");
  return (
    <p role="status" className="flex items-center gap-2 text-[13px] text-slate">
      <span className="size-2 animate-pulse rounded-full bg-warning" aria-hidden />
      {t("working")}
    </p>
  );
}

export function useRun(workshopId: string) {
  const t = useTranslations("outline");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (request: string | null, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await requestOutline(workshopId, request);
      if (result.ok) {
        after?.();
        router.refresh();
      } else setError(t(`errors.${result.error}`));
    });
  return { go, pending, error };
}

/** The first outline: one button, and what happens when it is pressed. */
export function MakeOutline({
  workshopId,
  big = false,
  quiet = false,
}: {
  workshopId: string;
  big?: boolean;
  /** A secondary button, where the view already has its main one. */
  quiet?: boolean;
}) {
  const t = useTranslations("outline");
  const { go, pending, error } = useRun(workshopId);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={quiet ? "secondary" : "primary"}
        className={big ? "h-12 self-stretch text-[15px] md:self-start" : "self-start"}
        disabled={pending}
        onClick={() => go(null)}
      >
        <Sparkles className="size-4" aria-hidden />
        {t("make")}
      </Button>
      {pending && <Working />}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * The conversation with Distil about the outline: ask for a change in
 * plain words, make it again from the notes and the answers, or undo
 * Distil's last change.
 */
export function AskDistil({ workshopId, canUndo }: { workshopId: string; canUndo: boolean }) {
  const t = useTranslations("outline");
  const router = useRouter();
  const { go, pending, error } = useRun(workshopId);
  const [request, setRequest] = useState("");
  const [undoing, startUndo] = useTransition();

  return (
    <section
      aria-labelledby="ask-title"
      className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-4"
    >
      <h2 id="ask-title" className="text-[14px] font-semibold">
        {t("askTitle")}
      </h2>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = request.trim();
          if (text) go(text, () => setRequest(""));
        }}
      >
        <Textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={t("askPlaceholder")}
          aria-label={t("askTitle")}
          maxLength={1000}
          rows={3}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending || !request.trim()}>
            <Send className="size-3.5" aria-hidden />
            {t("ask")}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(null)}>
            {t("remake")}
          </Button>
          {canUndo && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending || undoing}
              onClick={() =>
                startUndo(async () => {
                  await undoOutlineAction(workshopId);
                  router.refresh();
                })
              }
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {t("undo")}
            </Button>
          )}
        </div>
      </form>
      {pending && <Working />}
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <p className="text-[12px] text-slate">{t("askHint")}</p>
    </section>
  );
}
