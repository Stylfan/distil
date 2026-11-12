"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import type { StoryOutcome } from "@/lib/story-run";

/**
 * Asking Distil to change the presentation in plain words ("gør den klar
 * til direktionen", "fjern tema 7"), or to write its story again. One
 * field; what it can do and a few examples are behind "?". Distil answers
 * in a sentence under the toolbar.
 */

const SUGGESTIONS = ["board", "sharper", "shorter", "participants"] as const;

export function useTellStory(workshopId: string) {
  const te = useTranslations("outline.errors");
  const t = useTranslations("deck.story");
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "reply" | "error"; text: string } | null>(null);
  const [telling, start] = useTransition();
  const tell = (request: string | null, done?: () => void) =>
    start(async () => {
      setMessage(null);
      try {
        const response = await fetch(`/api/workshops/${encodeURIComponent(workshopId)}/story`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request }),
        });
        const result = (await response.json()) as
          StoryOutcome | { ok: false; error: "unauthorized" | "invalid" };
        if (result.ok) {
          done?.();
          if (request) setMessage({ kind: "reply", text: result.reply || t("changed") });
          router.refresh();
        } else setMessage({ kind: "error", text: te(result.error) });
      } catch {
        setMessage({ kind: "error", text: te("provider") });
      }
    });
  return { tell, telling, message };
}

/** The ask field and its help behind "?": on the presentation, and on the outline. */
export function StoryAsk({
  telling,
  onAsk,
  words = "deck.story",
  suggestions = SUGGESTIONS,
  extra,
}: {
  telling: boolean;
  onAsk: (request: string, done: () => void) => void;
  /** Where its words are: the presentation's, or the outline's. Both have the same keys. */
  words?: "deck.story" | "outline.bar";
  suggestions?: readonly string[];
  /** More to do, shown with the help behind "?". */
  extra?: React.ReactNode;
}) {
  const t = useTranslations(words);
  const [request, setRequest] = useState("");
  const [help, setHelp] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!help) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setHelp(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [help]);

  const send = () => request.trim() && onAsk(request.trim(), () => setRequest(""));

  return (
    <div ref={box} className="relative flex min-w-0 flex-1">
      <form
        className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-md border border-hairline bg-white pr-1 pl-3 focus-within:border-ink"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="deck-request" className="sr-only">
          {t("askTitle")}
        </label>
        <input
          id="deck-request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={telling ? t("working") : t("askPlaceholder")}
          maxLength={1000}
          disabled={telling}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-slate focus:outline-none"
        />
        <button
          type="button"
          aria-label={t("help")}
          aria-expanded={help}
          onClick={() => setHelp((h) => !h)}
          className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-[11px] text-slate hover:border-slate hover:text-ink"
        >
          ?
        </button>
        <button
          type="submit"
          aria-label={t("send")}
          disabled={telling || !request.trim()}
          className="grid size-7 shrink-0 place-items-center rounded text-slate hover:bg-sand hover:text-ink disabled:opacity-40"
        >
          <Send className="size-3.5" aria-hidden />
        </button>
      </form>
      {help && (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-3 text-[12px] leading-relaxed text-slate shadow-[0_8px_24px_rgba(31,45,51,0.12)]">
          <p>{t("askHint")}</p>
          {extra}
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setRequest(t(`suggestions.${s}`));
                  setHelp(false);
                }}
                className="rounded-full border border-hairline bg-white px-2.5 py-1 text-[12px] text-ink hover:border-slate"
              >
                {t(`suggestions.${s}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
