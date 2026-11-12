import type { DeckNote } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import { NOTE_EDGE, NOTE_FILL } from "@/components/workshop/colours";

/** The pieces every slide is made of: the frame, a heading, bullets, a post-it, an overview column. */

export const cq = (n: number) => `${n}cqw`;

export function Frame({
  children,
  number,
  total,
  words,
}: {
  children: React.ReactNode;
  number: number;
  total: number;
  words: DeckWords;
}) {
  return (
    <section
      className="deck-slide @container relative aspect-video w-full overflow-hidden rounded-md border border-hairline bg-white text-ink shadow-[0_1px_2px_rgba(31,45,51,0.06)] print:rounded-none print:border-0 print:shadow-none"
      aria-roledescription="slide"
    >
      <div className="absolute inset-0 flex flex-col" style={{ padding: `${cq(4.5)} ${cq(5.5)}` }}>
        {children}
      </div>
      <span
        className="absolute text-slate tabular"
        style={{ right: cq(3), bottom: cq(2.2), fontSize: cq(1.1) }}
      >
        {words.page(number, total)}
      </span>
    </section>
  );
}

export function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <header style={{ marginBottom: cq(2.4) }}>
      <h2 className="leading-tight font-semibold tracking-[-0.01em]" style={{ fontSize: cq(3.2) }}>
        {children}
        {sub && (
          <span className="font-normal text-slate" style={{ fontSize: cq(1.8) }}>
            {" "}
            · {sub}
          </span>
        )}
      </h2>
    </header>
  );
}

export function Bullets({ items, size = 1.85 }: { items: React.ReactNode[]; size?: number }) {
  return (
    <ul className="flex flex-col" style={{ gap: cq(1.1), fontSize: cq(size) }}>
      {items.map((item, i) => (
        <li key={i} className="flex leading-snug" style={{ gap: cq(1.2) }}>
          <span
            className="shrink-0 rounded-full bg-ink/35"
            style={{ width: cq(0.6), height: cq(0.6), marginTop: cq(0.75) }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PostIt({ note, size }: { note: DeckNote; size: number }) {
  const plain = note.colour === "none" || note.colour === "white";
  return (
    <li
      className="relative flex items-center justify-center overflow-hidden text-center leading-tight text-ink"
      style={{
        aspectRatio: "1",
        padding: cq(0.8),
        fontSize: cq(size),
        background: plain ? "#F1EFE8" : NOTE_FILL[note.colour],
        border: `1px solid ${NOTE_EDGE[note.colour]}`,
        boxShadow: "0 1px 2px rgba(31,45,51,0.08)",
      }}
    >
      <span className="line-clamp-5">{note.text}</span>
      {(note.votes ?? 0) > 0 && (
        // The dots the participants put on it, as they did on the wall.
        <span
          className="absolute flex flex-wrap justify-end text-bronze-deep"
          style={{
            right: cq(0.4),
            top: cq(0.3),
            fontSize: cq(0.95),
            maxWidth: "70%",
            gap: cq(0.1),
          }}
          aria-label={String(note.votes)}
        >
          {(note.votes ?? 0) <= 5 ? "●".repeat(note.votes ?? 0) : `● ${note.votes}`}
        </span>
      )}
    </li>
  );
}

export function OverviewColumn({
  title,
  items,
  mark,
}: {
  title: string;
  items: string[];
  mark?: (i: number) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col" style={{ gap: cq(1) }}>
      <p
        className="font-semibold tracking-[0.08em] text-slate uppercase"
        style={{ fontSize: cq(1.2) }}
      >
        {title}
      </p>
      <ul className="flex flex-col" style={{ gap: cq(0.8), fontSize: cq(1.6) }}>
        {items.map((item, i) => (
          <li key={i} className="leading-snug">
            {mark && <span className="mr-1 text-slate">{mark(i)}</span>}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
