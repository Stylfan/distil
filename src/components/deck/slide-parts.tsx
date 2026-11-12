import type { DeckNote } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import type { Icon, Look } from "@/domain/story";
import { NOTE_EDGE, NOTE_FILL } from "@/components/workshop/colours";
import { DeckIcon } from "./icons";
import { c } from "./look";
import { Motif, type MotifPlace } from "./motif";

/**
 * The pieces every slide is made of. Sizes are given in the pixels of a
 * 1280×720 slide and turned into container units, so a slide looks the
 * same small on the screen, on a phone and full-page in the PDF.
 */

export const px = (n: number) => `${(n / 12.8).toFixed(3)}cqw`;

export type Tone = "paper" | "brand" | "deep";

export function Frame({
  children,
  number,
  total,
  words,
  footer,
  tone = "paper",
  look,
  motif,
}: {
  children: React.ReactNode;
  number: number;
  total: number;
  words: DeckWords;
  footer: string;
  tone?: Tone;
  look: Look;
  motif?: MotifPlace;
}) {
  const dark = tone !== "paper";
  return (
    <section
      className="deck-slide @container relative aspect-video w-full overflow-hidden rounded-md shadow-[0_2px_10px_rgba(20,30,40,0.12)] print:rounded-none print:shadow-none"
      style={{
        background: tone === "brand" ? c("brand") : tone === "deep" ? c("deep") : c("paper"),
        color: dark ? "#fff" : c("ink"),
        fontFeatureSettings: '"ss01", "cv11"',
      }}
      aria-roledescription="slide"
    >
      {motif && <Motif look={look} place={motif} />}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ padding: `${px(60)} ${px(80)} ${px(64)}` }}
      >
        {children}
      </div>
      <div
        className="absolute flex justify-between tabular"
        style={{
          left: px(80),
          right: px(80),
          bottom: px(24),
          fontSize: px(12),
          color: dark ? "rgba(255,255,255,.65)" : c("muted"),
        }}
      >
        <span className="truncate">{footer}</span>
        <span>{words.page(number, total)}</span>
      </div>
    </section>
  );
}

export function Kicker({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className="font-bold uppercase"
      style={{ fontSize: px(14), letterSpacing: ".14em", color: light ? c("accent") : c("brand") }}
    >
      {children}
    </p>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center self-start rounded-full font-bold uppercase"
      style={{
        fontSize: px(12),
        letterSpacing: ".08em",
        padding: `${px(5)} ${px(12)}`,
        gap: px(8),
        background: c("soft"),
        color: c("brand"),
      }}
    >
      {children}
    </span>
  );
}

/** A headline that says what the slide shows: a sentence, large, at most two or three lines. */
export function Headline({ children, size = 36 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2
      className="font-bold"
      style={{
        fontSize: px(size),
        lineHeight: 1.15,
        letterSpacing: "-.01em",
        marginTop: px(12),
        maxWidth: px(1040),
      }}
    >
      {children}
    </h2>
  );
}

/** The consequence, in the deep colour at the foot of a slide. */
export function SoWhat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center"
      style={{
        marginTop: "auto",
        gap: px(18),
        background: c("deep"),
        color: "#fff",
        borderRadius: px(12),
        padding: `${px(16)} ${px(24)}`,
        fontSize: px(19),
        lineHeight: 1.35,
      }}
    >
      <b
        className="uppercase"
        style={{
          color: c("accent"),
          letterSpacing: ".08em",
          fontSize: px(13),
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </b>
      <span>{children}</span>
    </div>
  );
}

export function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        borderRadius: px(14),
        padding: px(28),
        boxShadow: "0 1px 0 rgba(0,0,0,.04), 0 8px 24px rgba(19,33,61,.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ n, size = 34 }: { n: number | string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{
        width: px(size),
        height: px(size),
        fontSize: px(size * 0.45),
        background: c("brand"),
        color: "#fff",
      }}
    >
      {n}
    </span>
  );
}

export function IconTile({ icon, size = 56 }: { icon: Icon; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: px(size),
        height: px(size),
        borderRadius: px(size * 0.28),
        background: c("soft"),
        color: c("brand"),
      }}
    >
      <DeckIcon icon={icon} size={px(size * 0.56)} />
    </span>
  );
}

/** A note as it hung on the wall, a little askew, with the dots it got. */
export function PostIt({
  note,
  index,
  size = 1,
}: {
  note: DeckNote;
  index: number;
  size?: number;
}) {
  const plain = note.colour === "none" || note.colour === "white";
  const tilt = [-2, 1.5, -1, 2, -1.5, 1][index % 6]!;
  return (
    <li
      className="relative flex items-center justify-center overflow-hidden text-center"
      style={{
        aspectRatio: "1.12",
        padding: px(12 * size),
        fontSize: px(15 * size),
        lineHeight: 1.25,
        color: "#2a2a2a",
        background: plain ? "#F1EFE8" : NOTE_FILL[note.colour],
        borderBottom: `${px(3)} solid ${NOTE_EDGE[note.colour]}`,
        boxShadow: "0 6px 14px rgba(0,0,0,.12)",
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <span className="line-clamp-5">{note.text}</span>
      {(note.votes ?? 0) > 0 && (
        // The dots the participants put on it, as they did on the wall.
        <span
          className="absolute flex flex-wrap justify-end"
          style={{ right: px(6), top: px(4), fontSize: px(11), maxWidth: "70%", color: c("deep") }}
          aria-label={String(note.votes)}
        >
          {(note.votes ?? 0) <= 5 ? "●".repeat(note.votes ?? 0) : `● ${note.votes}`}
        </span>
      )}
    </li>
  );
}
