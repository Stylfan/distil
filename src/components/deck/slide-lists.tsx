import type { Slide } from "@/domain/deck";
import type { Icon } from "@/domain/story";
import { DiagramView } from "@/components/diagram/diagram-view";
import { NOTE_EDGE, NOTE_FILL } from "@/components/workshop/colours";
import { DeckIcon } from "./icons";
import { Editable, EditableOr } from "./editable";
import { c } from "./look";
import { Card, Frame, Headline, IconTile, Kicker, Pill, px } from "./slide-parts";
import type { SlideProps } from "./slide";

/** The slides that list: patterns, proposals, open points, the shifts, what was agreed, the votes. */

type Of<K extends Slide["kind"]> = SlideProps & { slide: Extract<Slide, { kind: K }> };

const LIST_LOOK: Record<
  Extract<Slide, { kind: "list" }>["heading"],
  { icon: Icon; list: "patterns" | "recommendations" | "openPoints" }
> = {
  patterns: { icon: "lightbulb", list: "patterns" },
  recommendations: { icon: "sparkles", list: "recommendations" },
  open: { icon: "search", list: "openPoints" },
};

export function ListSlide({ slide, ...props }: Of<"list">) {
  const { words } = props;
  const look = LIST_LOOK[slide.heading];
  const title =
    slide.heading === "patterns"
      ? words.patterns
      : slide.heading === "recommendations"
        ? words.recommendations
        : words.open;
  const few = slide.items.length <= 3;
  return (
    <Frame {...props}>
      <Kicker>
        {slide.heading === "open" ? words.openKicker : words.chapters.means}
        {slide.continued && ` · ${words.continued}`}
      </Kicker>
      <Headline>{title}</Headline>
      <div className="flex flex-1 flex-col justify-center" style={{ paddingBottom: px(20) }}>
        <ol
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${few ? slide.items.length : 2}, minmax(0,1fr))`,
            gap: px(20),
          }}
        >
          {slide.items.map((item, i) => (
            <Card
              key={item.id}
              className="flex"
              style={{
                gap: px(18),
                padding: few ? px(32) : px(22),
                minHeight: few ? px(260) : undefined,
                flexDirection: few ? "column" : "row",
                borderTop: slide.heading === "open" ? `${px(5)} solid ${c("warn")}` : undefined,
              }}
            >
              <IconTile icon={look.icon} size={few ? 60 : 46} />
              <div className="min-w-0">
                {slide.heading === "recommendations" ? (
                  <Pill>{words.suggestion}</Pill>
                ) : slide.heading === "patterns" ? (
                  <p
                    className="font-bold uppercase"
                    style={{ fontSize: px(12), letterSpacing: ".1em", color: c("muted") }}
                  >
                    {words.insight(i + 1)}
                  </p>
                ) : null}
                <p
                  style={{
                    fontSize: px(slide.items.length <= 2 ? 26 : few ? 22 : 19),
                    lineHeight: 1.4,
                    marginTop: px(8),
                  }}
                >
                  <Editable value={item.text} at={{ kind: "item", list: look.list, id: item.id }} />
                </p>
              </div>
            </Card>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

export function ShiftsSlide({ slide, ...props }: Of<"shifts">) {
  const { words } = props;
  return (
    <Frame {...props}>
      <Kicker>{words.chapters.means}</Kicker>
      <Headline>{words.shifts}</Headline>
      <div className="flex flex-1 flex-col justify-center" style={{ paddingBottom: px(20) }}>
        <div className="grid" style={{ gridTemplateColumns: `1fr ${px(70)} 1fr`, rowGap: px(14) }}>
          <p
            className="font-bold uppercase"
            style={{ fontSize: px(13), letterSpacing: ".12em", color: c("muted") }}
          >
            {words.today}
          </p>
          <span />
          <p
            className="font-bold uppercase"
            style={{ fontSize: px(13), letterSpacing: ".12em", color: c("brand") }}
          >
            {words.ahead}
          </p>
          {slide.rows.map((r) => (
            <div key={r.index} className="contents">
              <div
                style={{
                  background: c("soft"),
                  borderRadius: px(12),
                  padding: `${px(22)} ${px(26)}`,
                  fontSize: px(23),
                  lineHeight: 1.35,
                }}
              >
                <Editable value={r.from} at={{ kind: "shift", index: r.index, field: "from" }} />
              </div>
              <span className="grid place-items-center" style={{ color: c("brand") }}>
                <svg viewBox="0 0 40 24" style={{ width: px(40) }} aria-hidden>
                  <path
                    d="M2 12h32M26 4l8 8-8 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div
                className="font-semibold"
                style={{
                  background: c("deep"),
                  color: "#fff",
                  borderRadius: px(12),
                  padding: `${px(22)} ${px(26)}`,
                  fontSize: px(23),
                  lineHeight: 1.35,
                }}
              >
                <Editable value={r.to} at={{ kind: "shift", index: r.index, field: "to" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function ActionsSlide({ slide, ...props }: Of<"actions">) {
  const { words } = props;
  return (
    <Frame {...props}>
      <Kicker>
        {words.agreedLine}
        {slide.continued && ` · ${words.continued}`}
      </Kicker>
      <Headline>{words.agreed}</Headline>
      <div className="flex flex-1 flex-col justify-center" style={{ paddingBottom: px(20) }}>
        <ol
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${slide.rows.length <= 3 ? slide.rows.length : 2}, minmax(0,1fr))`,
            gap: px(18),
          }}
        >
          {slide.rows.map((r) => (
            <Card
              key={r.id}
              className="flex items-start"
              style={{ gap: px(16), padding: px(22), borderLeft: `${px(6)} solid ${c("good")}` }}
            >
              <span style={{ color: c("good") }}>
                <DeckIcon icon="check" size={px(30)} />
              </span>
              <div className="flex min-w-0 flex-col" style={{ gap: px(10) }}>
                <p
                  className="font-semibold"
                  style={{ fontSize: px(slide.rows.length <= 2 ? 26 : 20), lineHeight: 1.35 }}
                >
                  <Editable value={r.what} at={{ kind: "action", id: r.id, field: "what" }} />
                </p>
                <p
                  className="flex flex-wrap"
                  style={{ gap: px(8), fontSize: px(14), color: c("muted") }}
                >
                  <span
                    style={{
                      background: c("soft"),
                      borderRadius: px(999),
                      padding: `${px(3)} ${px(10)}`,
                    }}
                  >
                    {words.who}:{" "}
                    <EditableOr value={r.who} at={{ kind: "action", id: r.id, field: "who" }} />
                  </span>
                  <span
                    style={{
                      background: c("soft"),
                      borderRadius: px(999),
                      padding: `${px(3)} ${px(10)}`,
                    }}
                  >
                    {words.when}:{" "}
                    <EditableOr value={r.when} at={{ kind: "action", id: r.id, field: "when" }} />
                  </span>
                </p>
              </div>
            </Card>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

export function VotesSlide({ slide, ...props }: Of<"votes">) {
  const { words } = props;
  const most = Math.max(...slide.notes.map((n) => n.votes ?? 0), 1);
  return (
    <Frame {...props}>
      <Kicker>{words.votesTotal(slide.total)}</Kicker>
      <Headline>{words.votes}</Headline>
      <ol
        className="flex flex-1 flex-col justify-center"
        style={{ gap: px(14), paddingBottom: px(20) }}
      >
        {slide.notes.map((n, i) => (
          <li
            key={n.id}
            className="grid items-center"
            style={{
              gridTemplateColumns: `${px(34)} minmax(0,1fr) 42% ${px(50)}`,
              gap: px(16),
              fontSize: px(18),
            }}
          >
            <span className="font-extrabold tabular" style={{ color: c("muted") }}>
              {i + 1}
            </span>
            <span className="truncate">{n.text}</span>
            <span
              className="block overflow-hidden"
              style={{ height: px(16), borderRadius: px(8), background: c("soft") }}
            >
              <span
                className="block h-full"
                style={{
                  width: `${((n.votes ?? 0) / most) * 100}%`,
                  borderRadius: px(8),
                  background: i === 0 ? c("brand") : c("accent"),
                }}
              />
            </span>
            <span className="text-right font-extrabold tabular" style={{ fontSize: px(20) }}>
              {n.votes}
            </span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

export function DiagramSlide({ slide, ...props }: Of<"diagram">) {
  const { words } = props;
  return (
    <Frame {...props}>
      <Kicker>{words.photo(slide.photo)}</Kicker>
      <Headline>{slide.title || words.drawing(slide.photo)}</Headline>
      <div
        className="flex min-h-0 flex-1 items-center justify-center"
        style={{ marginTop: px(16) }}
      >
        <Card style={{ padding: px(16), height: "100%", width: "100%" }}>
          <DiagramView
            diagram={slide.diagram}
            width={slide.width}
            height={slide.height}
            className="h-full max-h-full w-full"
          />
        </Card>
      </div>
    </Frame>
  );
}

export function TranscriptSlide({ slide, ...props }: Of<"transcript">) {
  const { words } = props;
  return (
    <Frame {...props}>
      <Headline size={28}>
        {words.transcript}
        {slide.continued && (
          <span className="font-normal" style={{ color: c("muted") }}>
            {" "}
            · {words.continued}
          </span>
        )}
      </Headline>
      <div style={{ columnCount: 3, columnGap: px(36), fontSize: px(14), marginTop: px(20) }}>
        {slide.groups.map((g, i) => (
          <div key={i} style={{ marginBottom: px(14) }}>
            <p
              className="break-after-avoid font-semibold"
              style={{ marginBottom: px(5), color: c("muted") }}
            >
              {words.photo(g.photo)}
            </p>
            <ul>
              {g.notes.map((n) => (
                <li
                  key={n.id}
                  className="flex break-inside-avoid leading-snug"
                  style={{ gap: px(8), marginBottom: px(4) }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      width: px(11),
                      height: px(11),
                      marginTop: px(3),
                      background: n.colour === "none" ? "transparent" : NOTE_FILL[n.colour],
                      border: `1px solid ${NOTE_EDGE[n.colour]}`,
                    }}
                  />
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}
