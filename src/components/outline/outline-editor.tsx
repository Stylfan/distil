"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { saveOutlineAction } from "@/actions/outlines";
import { newId, type Outline } from "@/domain/outline";
import { Button } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { EditableList } from "./editable-list";
import { ThemeCard, type NoteChip } from "./theme-card";

/**
 * The outline as the facilitator shapes it, one section after another in
 * the order the presentation will have them. Every change is saved a
 * moment after typing stops. What Distil interpreted is marked as such; a
 * recommendation stays Distil's proposal until it is kept.
 */

type SaveState = "saved" | "saving" | "conflict" | "failed";
const SAVE_AFTER_MS = 800;

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-bronze-deep">
      {children}
    </span>
  );
}

function Block({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        {title}
        {badge && <Badge>{badge}</Badge>}
      </h2>
      {children}
    </section>
  );
}

const field =
  "w-full resize-none overflow-hidden rounded border border-transparent bg-transparent px-1.5 py-1 text-ink [field-sizing:content] hover:border-hairline focus:border-ink focus:bg-surface focus:outline-none";

export function OutlineEditor({
  workshopId,
  initial,
  version: initialVersion,
  notes,
}: {
  workshopId: string;
  initial: Outline;
  version: number;
  notes: Record<string, NoteChip>;
}) {
  const t = useTranslations("outline");
  const router = useRouter();
  const [outline, setOutline] = useState(initial);
  const [state, setState] = useState<SaveState>("saved");
  const version = useRef(initialVersion);
  const first = useRef(true);
  const chips = new Map(Object.entries(notes));

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const timer = setTimeout(async () => {
      const result = await saveOutlineAction({
        workshopId,
        version: version.current,
        content: outline,
      });
      if (result.ok) {
        version.current = result.data;
        setState("saved");
      } else setState(result.error === "conflict" ? "conflict" : "failed");
    }, SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [outline, workshopId]);

  const set = <K extends keyof Outline>(key: K, value: Outline[K]) =>
    setOutline((o) => ({ ...o, [key]: value }));

  const moveTheme = (i: number, by: -1 | 1) => {
    const themes = [...outline.themes];
    const [theme] = themes.splice(i, 1);
    themes.splice(i + by, 0, theme!);
    set("themes", themes);
  };

  return (
    <div className="flex flex-col gap-8">
      <p
        role="status"
        className={cn(
          "text-[12px]",
          state === "conflict" || state === "failed" ? "text-danger" : "text-slate",
        )}
      >
        {t(`save.${state}`)}
        {state === "conflict" && (
          <button
            type="button"
            className="ml-2 underline underline-offset-4"
            onClick={() => router.refresh()}
          >
            {t("reload")}
          </button>
        )}
      </p>

      <Block title={t("summary")}>
        <textarea
          value={outline.summary}
          rows={2}
          onChange={(e) => set("summary", e.target.value)}
          aria-label={t("summary")}
          // Three lines to skim; the whole text while it is being read or changed.
          className={cn(
            field,
            "max-h-[5.1em] overflow-hidden text-[15px] leading-relaxed [field-sizing:content] focus:max-h-none",
          )}
        />
        {outline.summary.length > 260 && (
          <p className="px-1.5 text-[12px] text-slate">{t("summaryMore")}</p>
        )}
      </Block>

      <Block title={t("themes")}>
        <div className="flex flex-col gap-3">
          {outline.themes.map((theme, i) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              number={i + 1}
              notes={chips}
              first={i === 0}
              last={i === outline.themes.length - 1}
              onChange={(next) =>
                set(
                  "themes",
                  outline.themes.map((x, j) => (j === i ? next : x)),
                )
              }
              onMove={(by) => moveTheme(i, by)}
              onRemove={() =>
                set(
                  "themes",
                  outline.themes.filter((_, j) => j !== i),
                )
              }
            />
          ))}
          <Button
            size="sm"
            className="self-start"
            onClick={() =>
              set("themes", [
                ...outline.themes,
                { id: newId("t"), title: t("newTheme"), summary: "", points: [], noteIds: [] },
              ])
            }
          >
            <Plus className="size-3.5" aria-hidden />
            {t("addTheme")}
          </Button>
        </div>
      </Block>

      <Block title={t("patterns")} badge={t("distilsReading")}>
        <EditableList
          items={outline.patterns}
          onChange={(v) => set("patterns", v)}
          onAdd={() => ({ id: newId("p"), text: "" })}
          addLabel={t("addPattern")}
          itemLabel={(n) => t("pattern", { number: n })}
        />
      </Block>

      <Block title={t("recommendations")} badge={t("distilsProposal")}>
        <EditableList
          items={outline.recommendations}
          onChange={(v) => set("recommendations", v)}
          onAdd={() => ({ id: newId("r"), text: "", kept: true })}
          addLabel={t("addRecommendation")}
          itemLabel={(n) => t("recommendation", { number: n })}
          extra={(r, update) => (
            <button
              type="button"
              aria-pressed={r.kept}
              onClick={() => update({ ...r, kept: !r.kept })}
              className={cn(
                "mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[12px]",
                r.kept
                  ? "border-success/40 bg-success-soft text-success"
                  : "border-hairline bg-surface text-slate hover:text-ink",
              )}
            >
              {r.kept ? t("kept") : t("keep")}
            </button>
          )}
        />
      </Block>

      <Block title={t("actions")}>
        <div className="flex flex-col gap-1">
          {outline.actions.length > 0 && (
            <div className="grid grid-cols-[minmax(0,1fr)_9rem_8rem_1.75rem] gap-2 px-1.5 text-[12px] text-slate">
              <span>{t("what")}</span>
              <span>{t("who")}</span>
              <span>{t("when")}</span>
            </div>
          )}
          {outline.actions.map((a, i) => {
            const update = (next: Partial<typeof a>) =>
              set(
                "actions",
                outline.actions.map((x, j) => (j === i ? { ...x, ...next } : x)),
              );
            return (
              <div
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_9rem_8rem_1.75rem] items-start gap-2"
              >
                <textarea
                  value={a.what}
                  rows={1}
                  onChange={(e) => update({ what: e.target.value })}
                  aria-label={t("actionWhat", { number: i + 1 })}
                  className={cn(field, "text-[14px]")}
                />
                <input
                  value={a.who}
                  onChange={(e) => update({ who: e.target.value })}
                  placeholder={t("notWritten")}
                  aria-label={t("actionWho", { number: i + 1 })}
                  className={cn(field, "text-[13px]")}
                />
                <input
                  value={a.when}
                  onChange={(e) => update({ when: e.target.value })}
                  placeholder={t("notWritten")}
                  aria-label={t("actionWhen", { number: i + 1 })}
                  className={cn(field, "text-[13px]")}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "actions",
                      outline.actions.filter((_, j) => j !== i),
                    )
                  }
                  aria-label={t("remove", { item: t("action", { number: i + 1 }) })}
                  className="mt-1 rounded p-1 text-slate/50 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              set("actions", [
                ...outline.actions,
                { id: newId("a"), what: "", who: "", when: "", noteIds: [] },
              ])
            }
            className="flex items-center gap-1.5 self-start rounded px-1.5 py-1 text-[13px] text-slate hover:bg-sand hover:text-ink"
          >
            <Plus className="size-3.5" aria-hidden />
            {t("addAction")}
          </button>
        </div>
      </Block>

      <Block title={t("openPoints")}>
        <EditableList
          items={outline.openPoints}
          onChange={(v) => set("openPoints", v)}
          onAdd={() => ({ id: newId("o"), text: "", noteIds: [] })}
          addLabel={t("addOpenPoint")}
          itemLabel={(n) => t("openPoint", { number: n })}
        />
      </Block>
    </div>
  );
}
