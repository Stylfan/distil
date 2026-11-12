"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, MessageCircleQuestion } from "lucide-react";
import { answerQuestionAction } from "@/actions/outlines";
import { answerByLink } from "@/components/workshop/link-requests";
import { NOTE_EDGE, NOTE_FILL } from "@/components/workshop/colours";
import type { NoteColour } from "@/db/schema";
import type { Question } from "@/domain/outline";
import { withoutRefs } from "@/domain/outline-reading";
import { Button, Input } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

/**
 * Distil's questions, one at a time: the question, the notes it is about
 * as notes, tap an answer or write one, or skip to the next. Answered ones
 * fold away below, where an answer can be changed. Made for the phone,
 * used on the computer too; the keyboard's own microphone works for
 * speaking an answer.
 */

export type QuestionNote = { id: string; text: string; colour: NoteColour; photo: number };

export function QuestionCards({
  workshopId,
  questions,
  notes = [],
  big = false,
  linkToken,
}: {
  workshopId: string;
  questions: Question[];
  /** The workshop's notes, so a question can show the ones it is about. */
  notes?: QuestionNote[];
  big?: boolean;
  /** Set on a phone let in by a link. */
  linkToken?: string;
}) {
  const t = useTranslations("outline");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [showAnswered, setShowAnswered] = useState(false);
  if (questions.length === 0) return null;
  const open = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);
  // Skipped questions go to the back of the line, so the next one comes up.
  const queue = [
    ...open.filter((q) => !skipped.includes(q.id)),
    ...skipped.map((id) => open.find((q) => q.id === id)).filter((q): q is Question => !!q),
  ];
  const current = queue[0];
  const byId = new Map(notes.map((n) => [n.id, n]));

  return (
    <section aria-labelledby="questions-title" className="flex flex-col gap-2">
      <h2 id="questions-title" className="flex items-center gap-2 text-[14px] font-semibold">
        <MessageCircleQuestion className="size-4 text-warning" aria-hidden />
        {open.length > 0 ? t("questionsOpen", { count: open.length }) : t("questionsDone")}
      </h2>
      {current && (
        <QuestionCard
          key={`${current.id}-${current.answer ?? ""}`}
          linkToken={linkToken}
          workshopId={workshopId}
          question={current}
          notes={(current.noteIds ?? [])
            .map((id) => byId.get(id))
            .filter((n): n is QuestionNote => !!n)}
          position={{ at: open.indexOf(current) + 1, of: open.length }}
          onSkip={
            open.length > 1
              ? () => setSkipped((s) => [...s.filter((id) => id !== current.id), current.id])
              : undefined
          }
          big={big}
        />
      )}
      {answered.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showAnswered}
            onClick={() => setShowAnswered((v) => !v)}
            className="flex items-center gap-1.5 self-start text-[13px] text-slate hover:text-ink"
          >
            <ChevronDown
              className={cn("size-3.5 transition", showAnswered && "rotate-180")}
              aria-hidden
            />
            {t("answered", { count: answered.length })}
          </button>
          {showAnswered && (
            <ul className="flex flex-col gap-2">
              {answered.map((q) => (
                <QuestionCard
                  key={`${q.id}-${q.answer ?? ""}`}
                  linkToken={linkToken}
                  workshopId={workshopId}
                  question={q}
                  notes={[]}
                  big={big}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function QuestionCard({
  workshopId,
  question,
  notes,
  position,
  onSkip,
  big,
  linkToken,
}: {
  workshopId: string;
  question: Question;
  notes: QuestionNote[];
  position?: { at: number; of: number };
  onSkip?: () => void;
  big: boolean;
  linkToken?: string;
}) {
  const t = useTranslations("outline");
  const router = useRouter();
  const [own, setOwn] = useState("");
  const [editing, setEditing] = useState(!question.answer);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const send = (answer: string) =>
    start(async () => {
      const result = linkToken
        ? await answerByLink(linkToken, question.id, answer)
        : await answerQuestionAction({ workshopId, questionId: question.id, answer });
      setFailed(!result.ok);
      if (result.ok) router.refresh();
    });

  const photos = [...new Set(notes.map((n) => n.photo))];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-hairline bg-white p-4",
        !question.answer && "border-l-[3px] border-l-warning",
      )}
    >
      {position && (
        <p className="text-[11px] font-bold tracking-[0.12em] text-warning uppercase">
          {t("unsure", { at: position.at, of: position.of })}
        </p>
      )}
      <p className={cn("leading-snug font-medium text-ink", big ? "text-[16px]" : "text-[15px]")}>
        {withoutRefs(question.text)}
      </p>
      {notes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {notes.map((n) => (
            <span
              key={n.id}
              className="max-w-full -rotate-1 px-2.5 py-1.5 text-[12px] break-words text-ink shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
              style={{
                background: n.colour === "none" ? "#F1EFE8" : NOTE_FILL[n.colour],
                borderBottom: `2px solid ${NOTE_EDGE[n.colour]}`,
              }}
            >
              {n.text}
            </span>
          ))}
          <span className="text-[12px] text-slate">
            {t("onPhotos", { photos: photos.join(", "), count: photos.length })}
          </span>
        </div>
      )}
      {question.answer && !editing ? (
        <div className="flex items-center gap-2 text-[13px]">
          <Check className="size-4 shrink-0 text-success" aria-hidden />
          <span className="flex-1 text-ink">{question.answer}</span>
          <button
            type="button"
            className="text-slate underline underline-offset-4"
            onClick={() => setEditing(true)}
          >
            {t("changeAnswer")}
          </button>
        </div>
      ) : (
        <>
          {question.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {question.options.map((o) => (
                <Button
                  key={o}
                  size="sm"
                  disabled={pending}
                  className={cn(
                    "h-auto max-w-full min-h-8 py-1.5 text-left whitespace-normal",
                    big && "min-h-10 px-4 text-[14px]",
                  )}
                  onClick={() => send(o)}
                >
                  {o}
                </Button>
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (own.trim()) send(own.trim());
            }}
          >
            <Input
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder={t("ownAnswer")}
              aria-label={t("ownAnswer")}
              maxLength={600}
              className={cn("min-w-0", big && "h-10")}
            />
            <Button
              type="submit"
              size="sm"
              disabled={pending || !own.trim()}
              className={big ? "h-10" : undefined}
            >
              {t("answer")}
            </Button>
          </form>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="self-start text-[13px] text-slate underline-offset-4 hover:text-ink hover:underline"
            >
              {t("skip")}
            </button>
          )}
        </>
      )}
      {failed && <p className="text-[12px] text-danger">{t("saveFailed")}</p>}
    </div>
  );
}
