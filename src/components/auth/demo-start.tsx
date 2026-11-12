import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { startDemoAction } from "@/actions/demo-visit";
import { Button, buttonClass } from "@/components/ui/controls";
import { SectionLabel } from "@/components/ui/layout";
import { cn } from "@/lib/cn";
import { DEMO_HOURS } from "@/services/demo-visits";
import { sourceUrl } from "@/lib/demo-mode";

const SAME = "h-10 w-full justify-center text-[14px]";

/**
 * The front door of a demo installation: what the visitor gets and that
 * it is gone again after a day, then buttons of one size: start the demo,
 * fetch the code, sign in, and create an account when sign-up is open.
 */
export async function DemoStart({
  notice,
  canRegister,
}: {
  notice?: "busy" | "full";
  canRegister: boolean;
}) {
  const t = await getTranslations("demoVisit");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-slate">{t("body", { hours: DEMO_HOURS })}</p>
        <p className="text-sm leading-relaxed text-ink">{t("noRealData")}</p>
      </div>
      {notice && (
        <p role="status" className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          {t(notice)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <form action={startDemoAction}>
          <Button type="submit" variant="primary" className={SAME}>
            {t("start")}
          </Button>
        </form>
        <a
          href={sourceUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonClass("secondary"), SAME, "gap-1.5")}
        >
          {t("sourceButton")}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <Link href="/login?form=login" className={cn(buttonClass("secondary"), SAME)}>
          {t("loginButton")}
        </Link>
        {canRegister && (
          <Link href="/register" className={cn(buttonClass("secondary"), SAME)}>
            {t("registerButton")}
          </Link>
        )}
      </div>
    </div>
  );
}
