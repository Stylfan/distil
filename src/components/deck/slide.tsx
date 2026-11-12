import type { Slide } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import { DiagramView } from "@/components/diagram/diagram-view";
import { NOTE_EDGE, NOTE_FILL } from "@/components/workshop/colours";
import { Editable, EditableOr } from "./editable";
import { Bullets, Frame, Heading, OverviewColumn, PostIt, cq } from "./slide-parts";

/**
 * One slide, 16:9, neutral: no brand, white, ink text, a hairline and the
 * colours of the real post-its. Sizes are in container units, so a slide
 * looks the same small on the screen and full-page in the PDF.
 */

export function SlideView({
  slide,
  number,
  total,
  words,
}: {
  slide: Slide;
  number: number;
  total: number;
  words: DeckWords;
}) {
  const frame = (children: React.ReactNode) => (
    <Frame number={number} total={total} words={words}>
      {children}
    </Frame>
  );
  const sub = (continued: boolean) => (continued ? words.continued : undefined);

  switch (slide.kind) {
    case "title":
      return frame(
        <div
          className="flex flex-1 flex-col justify-end"
          style={{ gap: cq(1.4), paddingBottom: cq(4) }}
        >
          <span className="block bg-bronze" style={{ width: cq(6), height: cq(0.35) }} />
          <h1
            className="leading-[1.05] font-semibold tracking-[-0.02em]"
            style={{ fontSize: cq(5.4) }}
          >
            <Editable value={slide.title} at={{ kind: "workshopTitle" }} />
          </h1>
          <p className="text-slate" style={{ fontSize: cq(2) }}>
            {slide.date}
          </p>
        </div>,
      );
    case "overview": {
      const next = [...slide.agreed, ...slide.open];
      return frame(
        <>
          <Heading>{words.overview}</Heading>
          {slide.summary && (
            <p
              className="leading-relaxed"
              style={{ fontSize: cq(1.9), marginBottom: cq(3), maxWidth: "88%" }}
            >
              <Editable value={slide.summary} at={{ kind: "summary" }} multiline />
            </p>
          )}
          <div
            className="grid flex-1 content-start border-t border-hairline"
            style={{
              gap: cq(3.5),
              paddingTop: cq(2.4),
              // Only the columns that have something in them, so none stands empty.
              gridTemplateColumns: `repeat(${[slide.found, slide.recommend, next].filter((c) => c.length > 0).length || 1}, minmax(0, 1fr))`,
            }}
          >
            <OverviewColumn title={words.found} items={slide.found} />
            <OverviewColumn title={words.recommend} items={slide.recommend} />
            <OverviewColumn
              title={words.nextSteps}
              items={next}
              mark={(i) => (i < slide.agreed.length ? "✓" : "?")}
            />
          </div>
        </>,
      );
    }
    case "theme": {
      const columns = slide.notes.length > 8 ? 4 : 3;
      return frame(
        <>
          <Heading sub={sub(slide.continued)}>
            <span className="text-slate tabular">{slide.number} </span>
            <Editable value={slide.title} at={{ kind: "themeTitle", themeId: slide.themeId }} />
          </Heading>
          <div
            className="grid flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
            style={{ gap: cq(4) }}
          >
            <div className="flex min-w-0 flex-col" style={{ gap: cq(2) }}>
              {slide.summary && (
                <p className="leading-relaxed text-slate" style={{ fontSize: cq(1.7) }}>
                  <Editable
                    value={slide.summary}
                    at={{ kind: "themeSummary", themeId: slide.themeId }}
                    multiline
                  />
                </p>
              )}
              <Bullets
                items={slide.points.map((p) => (
                  <Editable
                    key={p.index}
                    value={p.text}
                    at={{ kind: "point", themeId: slide.themeId, index: p.index }}
                  />
                ))}
              />
            </div>
            {slide.notes.length > 0 && (
              <div className="flex min-w-0 flex-col" style={{ gap: cq(1) }}>
                <ul
                  className="grid content-start"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: cq(1) }}
                >
                  {slide.notes.map((n) => (
                    <PostIt key={n.id} note={n} size={columns === 4 ? 1.05 : 1.25} />
                  ))}
                </ul>
                {slide.moreNotes > 0 && (
                  <p className="text-slate" style={{ fontSize: cq(1.2) }}>
                    {words.more(slide.moreNotes)}
                  </p>
                )}
              </div>
            )}
          </div>
        </>,
      );
    }
    case "diagram":
      return frame(
        <>
          <Heading>{slide.title || words.drawing(slide.photo)}</Heading>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <DiagramView
              diagram={slide.diagram}
              width={slide.width}
              height={slide.height}
              className="h-full max-h-full w-full"
            />
          </div>
        </>,
      );
    case "list":
      return frame(
        <>
          <Heading sub={sub(slide.continued)}>
            {slide.heading === "patterns"
              ? words.patterns
              : slide.heading === "recommendations"
                ? words.recommendations
                : words.open}
          </Heading>
          <Bullets
            size={2.05}
            items={slide.items.map((item) => (
              <Editable
                key={item.id}
                value={item.text}
                at={{
                  kind: "item",
                  list:
                    slide.heading === "open"
                      ? "openPoints"
                      : slide.heading === "patterns"
                        ? "patterns"
                        : "recommendations",
                  id: item.id,
                }}
              />
            ))}
          />
        </>,
      );
    case "actions":
      return frame(
        <>
          <Heading sub={sub(slide.continued)}>{words.agreed}</Heading>
          <table className="w-full table-fixed border-collapse" style={{ fontSize: cq(1.7) }}>
            <thead>
              <tr className="text-left text-slate" style={{ fontSize: cq(1.2) }}>
                <th
                  className="font-semibold tracking-[0.08em] uppercase"
                  style={{ width: "58%", paddingBottom: cq(1) }}
                >
                  {words.what}
                </th>
                <th
                  className="font-semibold tracking-[0.08em] uppercase"
                  style={{ paddingBottom: cq(1) }}
                >
                  {words.who}
                </th>
                <th
                  className="font-semibold tracking-[0.08em] uppercase"
                  style={{ paddingBottom: cq(1) }}
                >
                  {words.when}
                </th>
              </tr>
            </thead>
            <tbody>
              {slide.rows.map((r) => (
                <tr key={r.id} className="border-t border-hairline align-top">
                  <td style={{ padding: `${cq(1)} ${cq(2)} ${cq(1)} 0` }}>
                    <Editable value={r.what} at={{ kind: "action", id: r.id, field: "what" }} />
                  </td>
                  <td className="text-slate" style={{ padding: `${cq(1)} ${cq(1)} ${cq(1)} 0` }}>
                    <EditableOr value={r.who} at={{ kind: "action", id: r.id, field: "who" }} />
                  </td>
                  <td className="text-slate" style={{ padding: `${cq(1)} 0` }}>
                    <EditableOr value={r.when} at={{ kind: "action", id: r.id, field: "when" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>,
      );
    case "votes": {
      const most = Math.max(...slide.notes.map((n) => n.votes ?? 0), 1);
      return frame(
        <>
          <Heading sub={words.votesTotal(slide.total)}>{words.votes}</Heading>
          <ol className="flex flex-col" style={{ gap: cq(1.1) }}>
            {slide.notes.map((n) => (
              <li
                key={n.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "minmax(0, 1fr) 38% 3.5em",
                  gap: cq(1.6),
                  fontSize: cq(1.6),
                }}
              >
                <span className="truncate">{n.text}</span>
                <span className="block" style={{ height: cq(1.1), background: "#EFEAE4" }}>
                  <span
                    className="block h-full"
                    style={{
                      width: `${((n.votes ?? 0) / most) * 100}%`,
                      background:
                        n.colour === "none" || n.colour === "white"
                          ? "#A88E6E"
                          : NOTE_EDGE[n.colour],
                    }}
                  />
                </span>
                <span className="text-right font-semibold tabular">{n.votes}</span>
              </li>
            ))}
          </ol>
        </>,
      );
    }
    case "transcript":
      return frame(
        <>
          <Heading sub={sub(slide.continued)}>{words.transcript}</Heading>
          <div style={{ columnCount: 3, columnGap: cq(3), fontSize: cq(1.15) }}>
            {slide.groups.map((g, i) => (
              <div key={i} style={{ marginBottom: cq(1.2) }}>
                <p
                  className="break-after-avoid font-semibold text-slate"
                  style={{ marginBottom: cq(0.4) }}
                >
                  {words.photo(g.photo)}
                </p>
                <ul>
                  {g.notes.map((n) => (
                    <li
                      key={n.id}
                      className="flex break-inside-avoid leading-snug"
                      style={{ gap: cq(0.6), marginBottom: cq(0.35) }}
                    >
                      <span
                        className="shrink-0"
                        style={{
                          width: cq(0.9),
                          height: cq(0.9),
                          marginTop: cq(0.25),
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
        </>,
      );
  }
}
