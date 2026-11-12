import { CircleHelp } from "lucide-react";

/**
 * A help text kept out of the way: a small question mark beside a heading
 * that shows the text while it is hovered or has keyboard focus. For
 * people who know the tool, the page stays quiet; the text is one hover
 * away for those who don't.
 */
export function HintIcon({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="rounded-full text-slate/60 hover:text-ink focus-visible:text-ink"
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-30 mt-1.5 w-72 rounded-md border border-hairline bg-surface px-3 py-2 text-[12px] leading-relaxed font-normal text-slate opacity-0 shadow-[0_4px_16px_rgba(31,45,51,0.12)] transition-opacity group-focus-within/hint:opacity-100 group-hover/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
