/**
 * The mark: a funnel with a bronze drop under it, many notes distilled
 * into one, and the name in spaced capitals. Decorative to assistive
 * technology; the link around it carries the name.
 */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M5 6 H23 L16 14.5 V19 L12 21 V14.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="24.5" r="2.1" fill="var(--color-bronze)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <Mark size={28} />
      <span className="text-[13px] font-semibold tracking-[0.32em]">DISTIL</span>
    </span>
  );
}
