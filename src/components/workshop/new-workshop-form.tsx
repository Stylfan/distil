"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createWorkshopAction } from "@/actions/workshops";
import { Button, Input, Label } from "@/components/ui/controls";
import { todayInCopenhagen } from "@/lib/dates";

/**
 * A new workshop: a name and the day, and straight to it, where the photos
 * go in. Big enough to use with a thumb at the wall.
 */
export function NewWorkshopForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const t = useTranslations("workshops");
  const te = useTranslations("errors");
  const router = useRouter();
  const [name, setName] = useState("");
  const [heldOn, setHeldOn] = useState(() => todayInCopenhagen());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      id="ny"
      className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface p-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await createWorkshopAction({ name, heldOn });
          if (result.ok) router.push(`/workshops/${result.data}`);
          else setError(te(result.error));
        });
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="workshop-name">{t("name")}</Label>
        <Input
          id="workshop-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
          maxLength={120}
          autoFocus={autoFocus}
          className="h-11 sm:h-9"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workshop-date">{t("heldOn")}</Label>
        <Input
          id="workshop-date"
          type="date"
          value={heldOn}
          onChange={(e) => setHeldOn(e.target.value)}
          required
          className="h-11 sm:h-9"
        />
      </div>
      <Button type="submit" variant="primary" disabled={pending} className="h-11 sm:h-9">
        {t("create")}
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-danger sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
}
