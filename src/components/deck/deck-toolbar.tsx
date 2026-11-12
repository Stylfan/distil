"use client";

import { useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Download, Pencil, Printer, Sparkles } from "lucide-react";
import { setIncludeTranscriptAction } from "@/actions/outlines";
import type { Look } from "@/domain/story";
import { Button, buttonClass } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { DeckEditContext } from "./editable";
import { LookPicker } from "./look-picker";
import { StoryAsk, useTellStory } from "./story-panel";

/**
 * Everything to do with the presentation, in one calm line above the
 * slides: the colour theme, asking Distil for a change, editing on the
 * slides, and saving it as PowerPoint or PDF. Below it, one quiet line with
 * the count, writing the story again and the transcript appendix. Before
 * Distil has told the story, telling it is the page's main action. On a
 * phone, only saving the PDF: the desk stays on the computer.
 */
export function DeckToolbar({
  workshopId,
  includeTranscript,
  told,
  look,
  summary,
  noteCount,
}: {
  workshopId: string;
  includeTranscript: boolean;
  told: boolean;
  look: Look;
  /** "18 slides · dansk". */
  summary: string;
  noteCount: number;
}) {
  const t = useTranslations("deck");
  const ts = useTranslations("deck.story");
  const router = useRouter();
  const { editing, toggle, state } = useContext(DeckEditContext);
  const { tell, telling, message } = useTellStory(workshopId);
  const [include, setInclude] = useState(includeTranscript);
  const [savingInclude, start] = useTransition();

  const pdf = (
    <Button variant={told ? "primary" : "secondary"} onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {t("savePdf")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-2 print:hidden">
      {!told && (
        <div className="hidden items-center gap-4 rounded-lg border border-hairline border-l-[3px] border-l-warning bg-white px-4 py-3 md:flex">
          <Sparkles className="size-4 shrink-0 text-bronze" aria-hidden />
          <p className="flex-1 text-[13px] leading-relaxed text-ink">
            <span className="font-semibold">{ts("untoldTitle")}.</span> {ts("untoldShort")}
          </p>
          <Button variant="primary" disabled={telling} onClick={() => tell(null)}>
            {ts("tell")}
          </Button>
        </div>
      )}

      <div className="hidden items-center gap-3 rounded-lg border border-hairline bg-white px-3 py-2.5 md:flex">
        <LookPicker workshopId={workshopId} look={look} />
        <span className="h-6 w-px bg-hairline" aria-hidden />
        <StoryAsk telling={telling} onAsk={(request, done) => tell(request, done)} />
        <Button variant={editing ? "primary" : "secondary"} aria-pressed={editing} onClick={toggle}>
          {editing ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Pencil className="size-4" aria-hidden />
          )}
          {editing ? t("doneEditing") : t("editShort")}
        </Button>
        {/* A plain link: the browser downloads the file, built on request. */}
        <a
          href={`/workshops/${workshopId}/praesentation/pptx`}
          className={buttonClass("secondary")}
          download
        >
          <Download className="size-4" aria-hidden />
          {t("pptxShort")}
        </a>
        {pdf}
      </div>

      <div className="flex md:hidden">{pdf}</div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate">
        <span>{summary}</span>
        <span aria-hidden className="hidden md:inline">
          ·
        </span>
        {told && (
          <>
            <button
              type="button"
              disabled={telling}
              onClick={() => tell(null)}
              className="hidden underline-offset-4 hover:text-ink hover:underline md:inline"
            >
              {ts("again")}
            </button>
            <span aria-hidden className="hidden md:inline">
              ·
            </span>
          </>
        )}
        <label className="hidden items-center gap-1.5 hover:text-ink md:flex">
          <input
            type="checkbox"
            checked={include}
            disabled={savingInclude}
            onChange={(e) => {
              const next = e.target.checked;
              setInclude(next);
              start(async () => {
                const result = await setIncludeTranscriptAction({ workshopId, include: next });
                if (result.ok) router.refresh();
                else setInclude(!next);
              });
            }}
            className="size-3.5 accent-ink"
          />
          {t("appendix", { count: noteCount })}
        </label>
        <span role="status" className="hidden md:inline">
          {telling && <span className="text-ink"> · {ts("working")}</span>}
          {editing && state === "idle" && ` · ${t("editHint")}`}
          {state !== "idle" && ` · ${t(`save.${state}`)}`}
        </span>
      </p>
      {message && (
        <p
          className={cn(
            "hidden rounded-md px-3 py-2 text-[13px] leading-relaxed md:block",
            message.kind === "reply" ? "bg-sand text-ink" : "text-danger",
          )}
        >
          {message.kind === "reply" && <span className="font-semibold">Distil: </span>}
          {message.text}
        </p>
      )}
    </div>
  );
}
