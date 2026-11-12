"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, ChevronDown, FileText, MessageSquareText, Mic } from "lucide-react";
import { setContextAction } from "@/actions/workshops";
import { AUDIENCES, EMPTY_CONTEXT, hasContext, type WorkshopContext } from "@/domain/context";
import { Button, Label, Textarea } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { agendaFromFile } from "./agenda-file";
import { preparePhoto } from "./shrink";

/**
 * What the facilitator tells Distil about the workshop, so the photos do
 * not stand alone: why it was held, who was there, who the presentation is
 * for and what it must do for them, and the agenda. Asked as questions,
 * answered in writing or by speaking through the keyboard's microphone,
 * and saved as soon as a field is left.
 */
export function ContextPanel({
  workshopId,
  context,
}: {
  workshopId: string;
  context: WorkshopContext | null;
}) {
  const t = useTranslations("context");
  const [value, setValue] = useState<WorkshopContext>(context ?? EMPTY_CONTEXT);
  const [open, setOpen] = useState(!hasContext(context));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [agendaState, setAgendaState] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const saved = useRef(JSON.stringify(context ?? EMPTY_CONTEXT));
  const fileInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const save = async (next: WorkshopContext) => {
    const json = JSON.stringify(next);
    if (json === saved.current) return;
    setState("saving");
    const result = await setContextAction({ id: workshopId, context: next });
    if (result.ok) saved.current = json;
    setState(result.ok ? "saved" : "failed");
  };
  const set = (key: keyof WorkshopContext, text: string) =>
    setValue((v) => ({ ...v, [key]: text }));
  const addAgenda = (text: string) => {
    const next = {
      ...value,
      agenda: [value.agenda.trim(), text.trim()].filter(Boolean).join("\n\n").slice(0, 6000),
    };
    setValue(next);
    void save(next);
  };

  const field = (key: keyof WorkshopContext, rows = 2, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`context-${key}`}>{t(`ask.${key}`)}</Label>
      <Textarea
        id={`context-${key}`}
        rows={rows}
        value={value[key]}
        placeholder={t(`example.${key}`)}
        onChange={(e) => set(key, e.target.value)}
        onBlur={() => void save(value)}
        maxLength={key === "agenda" ? 6000 : 1500}
      />
      {hint && <p className="text-[12px] text-slate">{hint}</p>}
    </div>
  );

  return (
    <section className="rounded-lg border border-hairline bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <MessageSquareText className="size-5 shrink-0 text-bronze" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold text-ink">{t("title")}</span>
          <span className="text-[13px] text-slate">
            {hasContext(value) ? summary(value, t("none")) : t("lead")}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 text-slate transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-hairline px-4 py-4">
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-slate">
            <Mic className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("speak")}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {field("purpose", 3)}
            {field("participants", 3)}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="context-audience">{t("ask.audience")}</Label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => {
                const word = t(`audiences.${a}`);
                const chosen = value.audience.toLowerCase().includes(word.toLowerCase());
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => {
                      const parts = value.audience
                        .split(",")
                        .map((p) => p.trim())
                        .filter(Boolean);
                      const next = chosen
                        ? parts.filter((p) => p.toLowerCase() !== word.toLowerCase())
                        : [...parts, word];
                      const updated = { ...value, audience: next.join(", ") };
                      setValue(updated);
                      void save(updated);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[13px]",
                      chosen
                        ? "border-ink bg-ink text-white"
                        : "border-hairline text-ink hover:border-slate",
                    )}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
            <Textarea
              id="context-audience"
              rows={1}
              value={value.audience}
              placeholder={t("example.audience")}
              onChange={(e) => set("audience", e.target.value)}
              onBlur={() => void save(value)}
              maxLength={300}
            />
          </div>
          {field("need", 2)}
          <div className="flex flex-col gap-2">
            {field("agenda", 6, t("agendaHint"))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                disabled={reading}
              >
                <FileText className="size-3.5" aria-hidden />
                {t("fromFile")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => photoInput.current?.click()}
                disabled={reading}
              >
                <Camera className="size-3.5" aria-hidden />
                {t("fromPhoto")}
              </Button>
              {agendaState && (
                <span role="status" className="text-[12px] text-slate">
                  {agendaState}
                </span>
              )}
              <input
                ref={fileInput}
                type="file"
                hidden
                accept=".docx,.pptx,.txt,.md,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  startReading(async () => {
                    const text = await agendaFromFile(file);
                    if (text === "type" || text === "unreadable")
                      setAgendaState(t(`fileError.${text}`));
                    else {
                      addAgenda(text);
                      setAgendaState(t("added"));
                    }
                  });
                }}
              />
              <input
                ref={photoInput}
                type="file"
                hidden
                accept="image/*,.heic,.heif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  startReading(async () => {
                    setAgendaState(t("readingPhoto"));
                    try {
                      const { whole } = await preparePhoto(file);
                      const response = await fetch(
                        `/api/workshops/${encodeURIComponent(workshopId)}/agenda-photo`,
                        { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: whole },
                      );
                      const result = (await response.json()) as
                        { ok: true; text: string } | { ok: false; error: string };
                      if (result.ok && result.text) {
                        addAgenda(result.text);
                        setAgendaState(t("addedPhoto"));
                      } else setAgendaState(t("photoError"));
                    } catch {
                      setAgendaState(t("photoError"));
                    }
                  });
                }}
              />
            </div>
          </div>
          {field("other", 2)}
          <p role="status" className="flex items-center gap-1.5 text-[12px] text-slate">
            {state === "saved" && <Check className="size-3.5 text-success" aria-hidden />}
            {state === "idle" ? t("autosave") : t(`save.${state}`)}
          </p>
        </div>
      )}
    </section>
  );
}

function summary(c: WorkshopContext, none: string): string {
  const text = [c.purpose, c.audience].filter((s) => s.trim()).join(" · ");
  return text ? (text.length > 140 ? `${text.slice(0, 140)}…` : text) : none;
}
