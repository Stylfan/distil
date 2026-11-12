"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { setIncludeTranscriptAction } from "@/actions/outlines";
import { Button } from "@/components/ui/controls";

/**
 * What to do with the presentation: save it as PDF through the browser's
 * own print (no library), and whether every note goes in as the last
 * appendix.
 */
export function DeckToolbar({
  workshopId,
  includeTranscript,
}: {
  workshopId: string;
  includeTranscript: boolean;
}) {
  const t = useTranslations("deck");
  const router = useRouter();
  const [include, setInclude] = useState(includeTranscript);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-hairline bg-surface px-4 py-3 print:hidden">
      <label className="flex items-center gap-2 text-[14px] text-ink">
        <input
          type="checkbox"
          checked={include}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setInclude(next);
            start(async () => {
              const result = await setIncludeTranscriptAction({ workshopId, include: next });
              if (result.ok) router.refresh();
              else setInclude(!next);
            });
          }}
          className="size-4 accent-ink"
        />
        {t("includeTranscript")}
      </label>
      <span className="flex-1" />
      <Button variant="primary" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden />
        {t("savePdf")}
      </Button>
      <p className="basis-full text-[12px] text-slate">{t("hint")}</p>
    </div>
  );
}
