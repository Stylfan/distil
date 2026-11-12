"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { endDemoAction } from "@/actions/demo-visit";
import { ConfirmButton } from "@/components/ui/confirm";

/** Ends a demo visit now, after one question: everything made in it goes at once. */
export function EndDemo() {
  const t = useTranslations("demoVisit");
  const common = useTranslations("common");
  const [, startTransition] = useTransition();
  return (
    <ConfirmButton
      label={t("end")}
      question={t("endQuestion")}
      detail={t("endDetail")}
      confirmLabel={t("endConfirm")}
      cancelLabel={common("cancel")}
      onConfirm={() => startTransition(() => endDemoAction())}
    />
  );
}
