"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Check, ChevronDown, FileText, MessageSquareText } from "lucide-react";
import { setContextAction } from "@/actions/workshops";
import { AUDIENCES, EMPTY_CONTEXT, hasContext, type WorkshopContext } from "@/domain/context";
import { Button } from "@/components/ui/controls";
import { MicButton, addWords } from "@/components/ui/mic-button";
import { cn } from "@/lib/cn";
import { agendaFromFile } from "./agenda-file";
import { preparePhoto } from "./shrink";

/**
 * What the facilitator tells Distil about the workshop, so the photos do
 * not stand alone: why it was held, who was there, who the presentation is
 * for and what it must do for them, and the agenda. One compact card: the
 * question on the left, the answer on one line on the right, a small
 * microphone in each field for speaking instead of typing, an example
 * behind "?", the agenda folded until it is wanted. Saved as soon as a
 * field is left.
 */

type Key = keyof WorkshopContext;
const MAX: Record<Key, number> = {
  purpose: 1500,
  participants: 800,
  audience: 300,
  need: 800,
  agenda: 6000,
  other: 1500,
};

export function ContextPanel({
  workshopId,
  context,
  open: shown,
  headless = false,
}: {
  workshopId: string;
  context: WorkshopContext | null;
  /** Set from outside (the toolbar on a computer); otherwise the panel opens itself. */
  open?: boolean;
  /** Without its own heading: the toolbar has the button that opens it. */
  headless?: boolean;
}) {
  const t = useTranslations("context");
  const router = useRouter();
  const [value, setValue] = useState<WorkshopContext>(context ?? EMPTY_CONTEXT);
  const [ownOpen, setOpen] = useState(!hasContext(context));
  const open = shown ?? ownOpen;
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [example, setExample] = useState<Key | null>(null);
  const [agendaOpen, setAgendaOpen] = useState(false);
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
    if (result.ok) {
      saved.current = json;
      router.refresh();
    }
    setState(result.ok ? "saved" : "failed");
  };
  const change = (key: Key, text: string, store = false) => {
    const next = { ...value, [key]: text.slice(0, MAX[key]) };
    setValue(next);
    if (store) void save(next);
  };
  const addAgenda = (text: string) => {
    change("agenda", [value.agenda.trim(), text.trim()].filter(Boolean).join("\n\n"), true);
    setAgendaOpen(true);
  };

  /** One answer: a field the height of its text, the microphone inside, the example behind "?". */
  const answer = (key: Key, rows = 1) => (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-start gap-1 rounded-md border border-hairline bg-white pr-1 focus-within:border-ink">
        <textarea
          id={`context-${key}`}
          rows={rows}
          value={value[key]}
          placeholder={t(`ask.${key}`)}
          onChange={(e) => change(key, e.target.value)}
          onBlur={() => void save(value)}
          maxLength={MAX[key]}
          className="min-h-9 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-[13px] leading-snug text-ink [field-sizing:content] placeholder:text-slate/70 focus:outline-none"
        />
        <MicButton
          className="mt-1"
          onText={(words) => change(key, addWords(value[key], words), true)}
        />
      </div>
      {example === key && <p className="px-1 text-[12px] text-slate">{t(`example.${key}`)}</p>}
    </div>
  );
  const help = (key: Key) => (
    <button
      type="button"
      aria-label={t("exampleFor", { field: t(`label.${key}`) })}
      aria-expanded={example === key}
      onClick={() => setExample((e) => (e === key ? null : key))}
      className="mt-1.5 hidden size-6 shrink-0 place-items-center rounded-full border md:grid border-hairline text-[11px] text-slate hover:border-slate hover:text-ink"
    >
      ?
    </button>
  );
  const row = (label: React.ReactNode, body: React.ReactNode, end?: React.ReactNode) => (
    <div className="grid gap-x-4 gap-y-1.5 border-t border-hairline-soft px-4 py-3 first:border-t-0 md:grid-cols-[11rem_minmax(0,1fr)_auto] md:items-start">
      <div className="pt-2 text-[13px] text-slate">{label}</div>
      {body}
      <div className="empty:hidden">{end}</div>
    </div>
  );

  if (headless && !open) return null;
  const firstAgendaLine = value.agenda.trim().split("\n")[0] ?? "";

  return (
    <section className="rounded-lg border border-hairline bg-surface">
      {!headless && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <MessageSquareText className="size-5 shrink-0 text-bronze" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-semibold text-ink">{t("title")}</span>
            <span className="truncate text-[13px] text-slate">
              {hasContext(value) ? summary(value, t("none")) : t("lead")}
            </span>
          </span>
          <ChevronDown
            className={cn("size-4 text-slate transition", open && "rotate-180")}
            aria-hidden
          />
        </button>
      )}
      {open && (
        <div
          className={cn(
            "flex flex-col bg-white",
            headless ? "rounded-lg" : "border-t border-hairline",
          )}
        >
          {row(
            <label htmlFor="context-purpose">{t("label.purpose")}</label>,
            answer("purpose"),
            help("purpose"),
          )}
          {row(
            <label htmlFor="context-participants">{t("label.participants")}</label>,
            answer("participants"),
            help("participants"),
          )}
          {row(
            t("label.audience"),
            <div className="flex flex-wrap items-center gap-1.5">
              {AUDIENCES.map((a) => {
                const word = t(`audiences.${a}`);
                const parts = value.audience
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean);
                const chosen = parts.some((p) => p.toLowerCase() === word.toLowerCase());
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() =>
                      change(
                        "audience",
                        (chosen
                          ? parts.filter((p) => p.toLowerCase() !== word.toLowerCase())
                          : [...parts, word]
                        ).join(", "),
                        true,
                      )
                    }
                    className={cn(
                      "h-8 rounded-full border px-3 text-[12px]",
                      chosen
                        ? "border-ink bg-ink text-white"
                        : "border-hairline bg-white text-ink hover:border-slate",
                    )}
                  >
                    {word}
                  </button>
                );
              })}
              <OtherAudience
                value={value.audience}
                known={AUDIENCES.map((a) => t(`audiences.${a}`))}
                placeholder={t("otherAudience")}
                onChange={(text) => change("audience", text, true)}
              />
            </div>,
          )}
          {row(
            <label htmlFor="context-need">{t("label.need")}</label>,
            answer("need"),
            help("need"),
          )}
          {row(
            t("label.agenda"),
            agendaOpen || value.agenda.trim() ? (
              <div className="flex flex-col gap-1.5">
                {answer("agenda", agendaOpen ? 4 : 1)}
                {agendaState && (
                  <span role="status" className="px-1 text-[12px] text-slate">
                    {agendaState}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAgendaOpen(true)}
                className="flex h-9 items-center gap-1.5 self-start text-[13px] text-slate hover:text-ink"
              >
                {firstAgendaLine || t("agendaNone")}
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            ),
            <span className="flex items-center gap-1.5">
              <Button size="sm" onClick={() => fileInput.current?.click()} disabled={reading}>
                <FileText className="size-3.5" aria-hidden />
                {t("fromFile")}
              </Button>
              <Button size="sm" onClick={() => photoInput.current?.click()} disabled={reading}>
                <Camera className="size-3.5" aria-hidden />
                {t("fromPhoto")}
              </Button>
            </span>,
          )}
          {row(
            <label htmlFor="context-other">{t("label.other")}</label>,
            answer("other"),
            help("other"),
          )}
          <p
            role="status"
            className="flex items-center gap-1.5 border-t border-hairline-soft px-4 py-2 text-[12px] text-slate"
          >
            {state === "saved" && <Check className="size-3.5 text-success" aria-hidden />}
            {state === "idle" ? t("autosave") : t(`save.${state}`)}
          </p>
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
              setAgendaOpen(true);
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
      )}
    </section>
  );
}

/** An audience not among the chips, typed or spoken in a small field after them. */
function OtherAudience({
  value,
  known,
  placeholder,
  onChange,
}: {
  value: string;
  known: string[];
  placeholder: string;
  onChange: (audience: string) => void;
}) {
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const chips = parts.filter((p) => known.some((k) => k.toLowerCase() === p.toLowerCase()));
  const others = parts.filter((p) => !chips.includes(p)).join(", ");
  const [text, setText] = useState(others);
  const commit = (next: string) =>
    onChange([...chips, ...next.split(",").map((p) => p.trim())].filter(Boolean).join(", "));
  return (
    <span className="flex h-8 w-44 items-center gap-1 rounded-full border border-hairline bg-white pr-0.5 pl-3 focus-within:border-ink">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={200}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-ink placeholder:text-slate/70 focus:outline-none"
      />
      <MicButton
        onText={(words) => {
          const next = addWords(text, words);
          setText(next);
          commit(next);
        }}
      />
    </span>
  );
}

export function summary(c: WorkshopContext, none: string): string {
  const text = [c.purpose, c.audience].filter((s) => s.trim()).join(" · ");
  return text ? (text.length > 140 ? `${text.slice(0, 140)}…` : text) : none;
}
