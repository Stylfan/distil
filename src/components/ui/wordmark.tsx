/**
 * The mark: a drop in a circle with a bronze dot under it, the essence
 * distilled from many notes, in the same family as Prismatic's circle,
 * triangle and dot; and the name in spaced capitals. Decorative to assistive
 * technology; the link around it carries the name.
 */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="12.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M14 6 C 18.6 11, 18.6 15, 14 19.4 C 9.4 15, 9.4 11, 14 6 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="22.6" r="1.7" fill="var(--color-bronze)" />
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
