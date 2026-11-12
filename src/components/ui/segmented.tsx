"use client";

import { cn } from "@/lib/cn";

/**
 * A small group of buttons where one is chosen: one click instead of a
 * dropdown, and every choice visible at once. A radio group underneath, so
 * the keyboard and screen readers treat it as one.
 */
export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  className,
}: {
  name: string;
  label: string;
  value: T | null;
  options: Array<{ value: T; label: string; title?: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        "inline-flex w-max overflow-hidden rounded-md border border-hairline bg-surface",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          title={o.title}
          className={cn(
            "cursor-pointer border-r border-hairline px-2.5 py-1 text-[12px] font-medium whitespace-nowrap transition-colors last:border-r-0 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink",
            value === o.value ? "bg-ink text-paper" : "text-slate hover:bg-sand hover:text-ink",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
