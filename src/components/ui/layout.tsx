import { CircleHelp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import { HintIcon } from "./hint-icon";

/**
 * Page structure inside the app frame. A page opens with a slim bar that
 * names where you are and holds the page's actions; sections below are
 * compact, titled blocks, not chapters of a document. Explanations belong
 * in empty states and hints, not above every block. The numbered bronze
 * label survives only in the steering-group report, which is a document.
 */

export function SectionLabel({
  number,
  children,
  className,
}: {
  number?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold tracking-[0.12em] text-slate uppercase",
        number !== undefined && "font-bold tracking-[0.18em] text-bronze-deep",
        className,
      )}
    >
      {number !== undefined && (
        <span className="tabular">{String(number).padStart(2, "0")} · </span>
      )}
      {children}
    </p>
  );
}

/**
 * The bar at the top of every page: where you are (the workshop, quietly),
 * the page's name, how to read it behind a small question mark, and the
 * page's actions.
 * Sticky, so the actions stay in reach while the page scrolls.
 */
export async function PageHeader({
  label,
  title,
  lead,
  actions,
}: {
  label?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const t = await getTranslations("common");
  return (
    <header className="z-30 -mx-4 flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline bg-paper/95 px-4 py-2.5 backdrop-blur md:sticky md:top-0 md:-mx-8 md:px-8 print:hidden">
      <div className="flex min-w-0 items-baseline gap-2.5">
        {label && (
          <>
            <span className="max-w-56 truncate text-[13px] text-slate">{label}</span>
            <span className="text-[13px] text-hairline" aria-hidden>
              /
            </span>
          </>
        )}
        <h1 className="shrink-0 text-[15px] font-semibold text-ink">{title}</h1>
        {/* How to read the page, folded behind a small question mark until asked for. */}
        {lead && (
          <details className="group relative self-center">
            <summary className="flex size-6 cursor-pointer list-none items-center justify-center rounded-full text-slate hover:bg-sand hover:text-ink group-open:bg-sand group-open:text-ink [&::-webkit-details-marker]:hidden">
              <CircleHelp className="size-4" aria-hidden />
              <span className="sr-only">{t("howToRead")}</span>
            </summary>
            <div className="absolute top-full left-0 z-40 mt-2 w-96 rounded-lg border border-hairline bg-surface p-4 text-[13px] leading-relaxed text-slate shadow-[0_8px_24px_rgba(31,45,51,0.12)]">
              {lead}
            </div>
          </details>
        )}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A titled block of a page. The label is kept for the few places that still pass one. */
export function Section({
  label,
  title,
  lead,
  hint,
  actions,
  children,
  id,
}: {
  number?: number;
  label: string;
  title?: string;
  lead?: string;
  /** Help kept behind a question mark beside the title, for pages people know well. */
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id={id ? `${id}-title` : undefined}
            className="flex items-center gap-1.5 text-[15px] font-semibold text-ink"
          >
            {title ?? label}
            {hint && <HintIcon text={hint} />}
          </h2>
          {lead && <p className="max-w-3xl text-[13px] leading-relaxed text-slate">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-hairline bg-surface p-4 sm:p-5", className)}
      {...props}
    />
  );
}

/** A small figure with its label: the building block of the overview and summaries. */
export function Stat({
  label,
  value,
  note,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border border-hairline bg-surface px-4 py-3",
        className,
      )}
    >
      <span className="text-[12px] text-slate">{label}</span>
      <span className="text-xl leading-tight font-semibold text-ink tabular">{value}</span>
      {note && (
        <span
          className={cn(
            "text-[12px] text-slate",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "danger" && "text-danger",
          )}
        >
          {note}
        </span>
      )}
    </div>
  );
}

/** A setting on one line: what it is and a short hint on the left, the control on the right. */
export function SettingRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-b border-hairline-soft py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] sm:items-center">
      <div className="flex min-w-0 flex-col gap-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[14px] font-medium text-ink">
            {label}
          </label>
        ) : (
          <span className="text-[14px] font-medium text-ink">{label}</span>
        )}
        {hint && <div className="text-[13px] leading-relaxed text-slate">{hint}</div>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">{children}</div>
    </div>
  );
}
