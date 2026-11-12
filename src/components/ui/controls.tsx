import { cn } from "@/lib/cn";

/**
 * The basic controls. One filled button per view (ink), everything else
 * outlined or quiet; fields are white with a hairline that turns ink on
 * focus. Compact, as tools are: 32-36px targets on a 4px rhythm.
 */

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function buttonClass(
  variant: ButtonProps["variant"] = "secondary",
  size: ButtonProps["size"] = "md",
) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" && "h-9 px-4 text-sm",
    size === "sm" && "h-8 px-3 text-[13px]",
    size === "icon" && "size-8",
    variant === "primary" && "bg-ink text-paper hover:bg-ink-soft",
    variant === "secondary" &&
      "border border-hairline bg-surface text-ink hover:border-slate/50 hover:bg-sand/50",
    variant === "ghost" && "text-slate hover:bg-sand hover:text-ink",
    variant === "danger" &&
      "border border-danger/40 bg-surface text-danger hover:bg-danger hover:text-surface",
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}

const FIELD =
  "w-full rounded-md border border-hairline bg-surface px-3 text-sm text-ink placeholder:text-slate/70 transition-colors hover:border-slate/60 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

/**
 * A quiet field for pages of many fields, like the report's texts: small
 * and soft at rest, so the page reads as text; white, outlined and roomier
 * when clicked into, so it is clear where one is writing.
 */
const QUIET =
  "border-transparent bg-sand/45 text-[13px] hover:border-hairline focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_var(--color-technical-soft)]";
const QUIET_AREA =
  "min-h-[3.75rem] resize-none transition-[min-height,background-color,box-shadow] focus:min-h-[10rem]";

type Quiet = { quiet?: boolean };

export function Input({ className, quiet, ...props }: React.ComponentProps<"input"> & Quiet) {
  return <input className={cn(FIELD, quiet ? cn(QUIET, "h-8") : "h-9", className)} {...props} />;
}

export function Textarea({ className, quiet, ...props }: React.ComponentProps<"textarea"> & Quiet) {
  return (
    <textarea
      className={cn(FIELD, "py-2 leading-relaxed", quiet && cn(QUIET, QUIET_AREA), className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(FIELD, "h-9 cursor-pointer", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-ink", className)} {...props} />;
}

export function Hint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs leading-relaxed text-slate", className)} {...props} />;
}
