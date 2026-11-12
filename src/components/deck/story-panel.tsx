"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { setLookAction } from "@/actions/outlines";
import { LOOKS, type Look } from "@/domain/story";
import type { StoryOutcome } from "@/lib/story-run";
import { Button } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { PALETTES } from "./look";

/**
 * How the presentation tells it: Distil writes the story (headlines that
 * say something, key messages, "so what", icons, a quote) from the
 * approved outline, and the facilitator picks the colour theme. Both can
 * be changed again at any time; every word can be changed on the slides.
 */
export function StoryPanel({
  workshopId,
  told,
  look,
}: {
  workshopId: string;
  told: boolean;
  look: Look;
}) {
  const t = useTranslations("deck.story");
  const te = useTranslations("outline.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Look>(look);
  const [telling, startTelling] = useTransition();
  const [, startLook] = useTransition();

  const tell = () =>
    startTelling(async () => {
      setError(null);
      try {
        const response = await fetch(`/api/workshops/${encodeURIComponent(workshopId)}/story`, {
          method: "POST",
        });
        const result = (await response.json()) as
          StoryOutcome | { ok: false; error: "unauthorized" };
        if (result.ok) router.refresh();
        else setError(te(result.error));
      } catch {
        setError(te("provider"));
      }
    });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border px-4 py-3 print:hidden",
        told ? "border-hairline bg-surface" : "border-warning/50 bg-warning-soft/50",
      )}
    >
      <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Sparkles className="size-4 text-bronze" aria-hidden />
          {told ? t("toldTitle") : t("untoldTitle")}
        </p>
        <p className="text-[13px] leading-relaxed text-slate">
          {told ? t("toldBody") : t("untoldBody")}
        </p>
        {telling && <p className="text-[13px] text-ink">{t("working")}</p>}
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
      <Button variant={told ? "secondary" : "primary"} disabled={telling} onClick={tell}>
        <Sparkles className="size-4" aria-hidden />
        {told ? t("again") : t("tell")}
      </Button>
      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">{t("look")}</legend>
        <span className="text-[13px] text-slate">{t("look")}</span>
        {LOOKS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={current === l}
            title={t(`looks.${l}`)}
            aria-label={t(`looks.${l}`)}
            onClick={() => {
              setCurrent(l);
              startLook(async () => {
                const result = await setLookAction({ workshopId, look: l });
                if (result.ok) router.refresh();
                else setCurrent(current);
              });
            }}
            className={cn(
              "relative grid size-8 place-items-center overflow-hidden rounded-full border-2 transition",
              current === l ? "border-ink" : "border-transparent hover:border-hairline",
            )}
            style={{
              background: `linear-gradient(135deg, ${PALETTES[l].brand} 0 55%, ${PALETTES[l].accent} 55% 100%)`,
            }}
          >
            {current === l && <Check className="size-4 text-white drop-shadow" aria-hidden />}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
