"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, MessageCircleQuestion } from "lucide-react";
import { answerQuestionAction } from "@/actions/outlines";
import { answerByLink } from "@/components/workshop/link-requests";
import type { Question } from "@/domain/outline";
import { Button, Input } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

/**
 * Distil's questions as cards: tap an answer, or write one. Made for the
 * phone, used on the computer too. The keyboard's own microphone works for
 * speaking an answer; Distil adds no speech service of its own.
 */
export function QuestionCards({
  workshopId,
  questions,
  big = false,
  linkToken,
}: {
  workshopId: string;
  questions: Question[];
  big?: boolean;
  /** Set on a phone let in by a link. */
  linkToken?: string;
}) {
  const t = useTranslations("outline");
  if (questions.length === 0) return null;
  const open = questions.filter((q) => !q.answer).length;
  return (
    <section aria-labelledby="questions-title" className="flex flex-col gap-2">
      <h2 id="questions-title" className="flex items-center gap-2 text-[14px] font-semibold">
        <MessageCircleQuestion className="size-4 text-warning" aria-hidden />
        {open > 0 ? t("questionsOpen", { count: open }) : t("questionsDone")}
      </h2>
      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <QuestionCard
            linkToken={linkToken}
            key={`${q.id}-${q.answer ?? ""}`}
            workshopId={workshopId}
            question={q}
            big={big}
          />
        ))}
      </ul>
    </section>
  );
}

function QuestionCard({
  workshopId,
  question,
  big,
  linkToken,
}: {
  workshopId: string;
  question: Question;
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

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        question.answer ? "border-hairline bg-surface" : "border-warning/50 bg-warning-soft/60",
      )}
    >
      <p className={cn("leading-snug text-ink", big ? "text-[15px]" : "text-[14px]")}>
        {question.text}
      </p>
      {question.answer && !editing ? (
        <div className="flex items-center gap-2 text-[13px]">
          <Check className="size-4 text-success" aria-hidden />
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
                  className={big ? "h-10 px-4 text-[14px]" : undefined}
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
              className={big ? "h-10" : undefined}
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
        </>
      )}
      {failed && <p className="text-[12px] text-danger">{t("saveFailed")}</p>}
    </li>
  );
}
