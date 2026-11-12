"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { requestMoreAction } from "@/actions/requests";
import { Button, Textarea } from "@/components/ui/controls";

/**
 * When the account's photos run low: ask the operator for more, with a
 * line on what for. Once asked, it says so until the operator answers.
 */
export function RequestMore({ requestedAt }: { requestedAt: number | null }) {
  const t = useTranslations("requestMore");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (requestedAt) {
    const day = new Date(requestedAt).toLocaleDateString("da-DK", {
      timeZone: "Europe/Copenhagen",
      day: "numeric",
      month: "long",
    });
    return <p className="text-[13px] text-slate">{t("waiting", { day })}</p>;
  }
  if (!open) {
    return (
      <Button size="sm" className="self-start" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await requestMoreAction(note);
          setError(!result.ok);
        });
      }}
    >
      <label htmlFor="more-note" className="text-[13px] font-medium">
        {t("noteLabel")}
      </label>
      <Textarea
        id="more-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("notePlaceholder")}
        maxLength={500}
        rows={2}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {t("send")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
      {error && <p className="text-[12px] text-danger">{t("failed")}</p>}
    </form>
  );
}
