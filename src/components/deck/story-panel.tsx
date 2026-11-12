"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, MessageSquareText, Send, Sparkles } from "lucide-react";
import { setLookAction } from "@/actions/outlines";
import { LOOKS, type Look } from "@/domain/story";
import type { StoryOutcome } from "@/lib/story-run";
import { Button, Textarea } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { BRANDED, LOGO_SRC, PALETTES } from "./look";

/**
 * How the presentation tells it: Distil writes the story (headlines that
 * say something, key messages, "so what", icons, a quote) from the
 * approved outline and the facilitator's context; the facilitator picks
 * the colour theme, and asks for changes in plain words ("gør det til
 * direktionen", "fjern tema 7"). Every word can also be changed on the slides.
 */

const SUGGESTIONS = ["board", "sharper", "shorter", "participants"] as const;

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
  const [reply, setReply] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  const [current, setCurrent] = useState<Look>(look);
  const [telling, startTelling] = useTransition();
  const [, startLook] = useTransition();

  const tell = (asked: string | null) =>
    startTelling(async () => {
      setError(null);
      setReply(null);
      try {
        const response = await fetch(`/api/workshops/${encodeURIComponent(workshopId)}/story`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: asked }),
        });
        const result = (await response.json()) as
          StoryOutcome | { ok: false; error: "unauthorized" | "invalid" };
        if (result.ok) {
          if (asked) {
            setRequest("");
            setReply(result.reply || t("changed"));
          }
          router.refresh();
        } else setError(te(result.error));
      } catch {
        setError(te("provider"));
      }
    });

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border px-4 py-3 print:hidden",
        told ? "border-hairline bg-surface" : "border-warning/50 bg-warning-soft/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Sparkles className="size-4 text-bronze" aria-hidden />
            {told ? t("toldTitle") : t("untoldTitle")}
          </p>
          <p className="text-[13px] leading-relaxed text-slate">
            {told ? t("toldBody") : t("untoldBody")}
          </p>
        </div>
        <Button
          variant={told ? "secondary" : "primary"}
          disabled={telling}
          onClick={() => tell(null)}
        >
          <Sparkles className="size-4" aria-hidden />
          {told ? t("again") : t("tell")}
        </Button>
      </div>

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t("look")}</legend>
        <span className="mr-1 text-[13px] text-slate">
          {t("look")}: <span className="text-ink">{t(`looks.${current}`)}</span>
        </span>
        {LOOKS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={current === l}
            title={t(`looks.${l}`)}
            aria-label={t(`looks.${l}`)}
            onClick={() => {
              const before = current;
              setCurrent(l);
              startLook(async () => {
                const result = await setLookAction({ workshopId, look: l });
                if (result.ok) router.refresh();
                else setCurrent(before);
              });
            }}
            className={cn(
              "relative grid size-8 place-items-center overflow-hidden rounded-full border-2 transition",
              current === l ? "border-ink" : "border-hairline hover:border-slate",
            )}
            style={{
              background: PALETTES[l].light
                ? `linear-gradient(135deg, ${PALETTES[l].soft} 0 50%, ${PALETTES[l].brand} 50% 75%, ${PALETTES[l].accent} 75% 100%)`
                : `linear-gradient(135deg, ${PALETTES[l].brand} 0 55%, ${PALETTES[l].accent} 55% 100%)`,
            }}
          >
            {l === BRANDED && (
              // eslint-disable-next-line @next/next/no-img-element -- a small local file
              <img src={LOGO_SRC} alt="" className="absolute inset-0.5 rounded-full bg-white" />
            )}
            {current === l && (
              <Check className="relative size-4 text-white drop-shadow" aria-hidden />
            )}
          </button>
        ))}
      </fieldset>

      <form
        className="flex flex-col gap-2 border-t border-hairline pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (request.trim()) tell(request.trim());
        }}
      >
        <label
          htmlFor="deck-request"
          className="flex items-center gap-2 text-[14px] font-semibold text-ink"
        >
          <MessageSquareText className="size-4 text-bronze" aria-hidden />
          {t("askTitle")}
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRequest(t(`suggestions.${s}`))}
              className="rounded-full border border-hairline px-3 py-1 text-[12px] text-ink hover:border-slate"
            >
              {t(`suggestions.${s}`)}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            id="deck-request"
            rows={2}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (request.trim()) tell(request.trim());
              }
            }}
            placeholder={t("askPlaceholder")}
            maxLength={1000}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={telling || !request.trim()}>
            <Send className="size-4" aria-hidden />
            {t("send")}
          </Button>
        </div>
        <p className="text-[12px] text-slate">{t("askHint")}</p>
      </form>
      {telling && <p className="text-[13px] text-ink">{t("working")}</p>}
      {reply && (
        <p className="rounded-md bg-sand px-3 py-2 text-[13px] leading-relaxed text-ink">
          <span className="font-semibold">Distil: </span>
          {reply}
        </p>
      )}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
