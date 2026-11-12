import type { Slide } from "@/domain/deck";
import { DeckIcon } from "./icons";
import { Editable, WhenFilled } from "./editable";
import { c } from "./look";
import {
  Badge,
  Card,
  Frame,
  Headline,
  IconTile,
  Kicker,
  Pill,
  PostIt,
  SoWhat,
  px,
} from "./slide-parts";
import type { SlideProps } from "./slide";

/** The slides that tell the findings: the whole message, the map of the themes, each theme. */

type Of<K extends Slide["kind"]> = SlideProps & { slide: Extract<Slide, { kind: K }> };

export function SummarySlide({ slide, ...props }: Of<"summary">) {
  const { words } = props;
  return (
    <Frame {...props}>
      <Kicker>{words.summaryKicker}</Kicker>
      <Headline>
        <Editable value={slide.headline} at={{ kind: "story", field: "headline" }} />
      </Headline>
      {slide.cards.length > 0 ? (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${slide.cards.length}, minmax(0, 1fr))`,
            gap: px(24),
            marginTop: px(40),
            flex: 1,
            alignContent: "center",
            paddingBottom: px(24),
          }}
        >
          {slide.cards.map((m) => (
            <Card key={m.index} style={{ minHeight: px(270), padding: px(30) }}>
              <div className="flex items-center justify-between">
                <span style={{ color: c("brand") }}>
                  <DeckIcon icon={m.icon} size={px(46)} />
                </span>
                <span className="font-extrabold" style={{ fontSize: px(44), color: c("soft") }}>
                  {String(m.index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3
                className="font-bold"
                style={{ fontSize: px(24), lineHeight: 1.2, margin: `${px(20)} 0 ${px(10)}` }}
              >
                <Editable
                  value={m.title}
                  at={{ kind: "keyMessage", index: m.index, field: "title" }}
                />
              </h3>
              <p style={{ fontSize: px(17), lineHeight: 1.5, color: c("muted") }}>
                <Editable
                  value={m.text}
                  at={{ kind: "keyMessage", index: m.index, field: "text" }}
                  multiline
                />
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: px(22),
            lineHeight: 1.5,
            marginTop: px(36),
            maxWidth: px(980),
            color: c("muted"),
          }}
        >
          <Editable value={slide.summary} at={{ kind: "summary" }} multiline />
        </p>
      )}
      <WhenFilled value={slide.soWhat}>
        <SoWhat label={words.soWhat}>
          <Editable value={slide.soWhat} at={{ kind: "story", field: "soWhat" }} />
        </SoWhat>
      </WhenFilled>
    </Frame>
  );
}

/** Where each theme sits on the map: around the workshop, alternating near and far. */
function orbit(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: 50 + Math.cos(angle) * 40, y: 50 + Math.sin(angle) * 37 };
  });
}

export function ThemeMapSlide({ slide, ...props }: Of<"themeMap">) {
  const { words } = props;
  const largest = [...slide.themes].sort((a, b) => b.notes - a.notes)[0]!;
  const most = Math.max(...slide.themes.map((t) => t.notes), 1);
  const asMap = slide.themes.length <= 8;
  const places = orbit(slide.themes.length);
  return (
    <Frame {...props}>
      <Kicker>{words.mapKicker}</Kicker>
      <Headline>{words.mapHeadline(slide.themes.length, largest.title.toLowerCase())}</Headline>
      {asMap ? (
        <div className="relative flex-1" style={{ marginTop: px(8) }}>
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <ellipse
              cx="50"
              cy="50"
              rx="40"
              ry="37"
              fill="none"
              stroke={c("muted")}
              strokeWidth=".15"
              strokeDasharray=".6 1.2"
              opacity=".6"
            />
            {places.map((p, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={p.x}
                y2={p.y}
                stroke={c("muted")}
                strokeWidth=".1"
                opacity=".35"
              />
            ))}
          </svg>
          <div
            className="absolute grid place-items-center rounded-full text-center font-bold"
            style={{
              left: "50%",
              top: "50%",
              width: px(150),
              height: px(150),
              transform: "translate(-50%,-50%)",
              background: c("brand"),
              color: "#fff",
              fontSize: px(17),
              lineHeight: 1.2,
            }}
          >
            {words.notes(slide.notes)}
          </div>
          {slide.themes.map((t, i) => {
            const r = 54 + (t.notes / most) * 34;
            return (
              <div
                key={t.id}
                className="absolute flex flex-col items-center text-center"
                style={{
                  left: `${places[i]!.x}%`,
                  top: `${places[i]!.y}%`,
                  transform: `translate(-50%, -${px(r / 2)})`,
                  width: px(210),
                }}
              >
                <span
                  className="grid place-items-center rounded-full"
                  style={{
                    width: px(r),
                    height: px(r),
                    background: "#fff",
                    border: `${px(3)} solid ${t.id === largest.id ? c("brand") : c("soft")}`,
                    color: c("brand"),
                    boxShadow: "0 6px 16px rgba(19,33,61,.1)",
                  }}
                >
                  <DeckIcon icon={t.icon} size={px(r * 0.5)} />
                </span>
                <b style={{ fontSize: px(16), lineHeight: 1.2, marginTop: px(8) }}>{t.title}</b>
                <span style={{ fontSize: px(13), color: c("muted") }}>{words.notes(t.notes)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4" style={{ gap: px(16), marginTop: px(34) }}>
          {slide.themes.map((t) => (
            <Card key={t.id} className="flex items-center" style={{ gap: px(14), padding: px(18) }}>
              <IconTile icon={t.icon} size={48} />
              <div className="min-w-0">
                <b className="line-clamp-2" style={{ fontSize: px(16), lineHeight: 1.2 }}>
                  {t.title}
                </b>
                <span style={{ fontSize: px(13), color: c("muted") }}>{words.notes(t.notes)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Frame>
  );
}

export function ThemeSlide({ slide, ...props }: Of<"theme">) {
  const { words } = props;
  const told = !!slide.headline;
  const notes = slide.notes.length > 0;
  return (
    <Frame {...props}>
      <Pill>
        <DeckIcon icon={slide.icon} size={px(15)} />
        {words.theme(slide.number)}
        {told && (
          <>
            {" "}
            · <Editable value={slide.title} at={{ kind: "themeTitle", themeId: slide.themeId }} />
          </>
        )}
        {slide.continued && ` · ${words.continued}`}
      </Pill>
      <Headline size={told ? 34 : 40}>
        {told ? (
          <Editable
            value={slide.headline}
            at={{ kind: "themeStory", themeId: slide.themeId, field: "headline" }}
          />
        ) : (
          <Editable value={slide.title} at={{ kind: "themeTitle", themeId: slide.themeId }} />
        )}
      </Headline>
      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: notes ? "minmax(0,1.12fr) minmax(0,1fr)" : "minmax(0,1fr)",
          gap: px(48),
          marginTop: px(28),
          marginBottom: px(18),
        }}
      >
        <div className="flex min-w-0 flex-col" style={{ gap: px(16) }}>
          {slide.summary && (
            <p
              className="line-clamp-3"
              style={{ fontSize: px(18), lineHeight: 1.45, color: c("muted") }}
            >
              <Editable
                value={slide.summary}
                at={{ kind: "themeSummary", themeId: slide.themeId }}
                multiline
              />
            </p>
          )}
          <ol
            className="grid"
            style={{
              gridTemplateColumns: notes ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))",
              gap: `${px(14)} ${px(36)}`,
            }}
          >
            {slide.points.map((p) => (
              <li
                key={p.index}
                className="flex items-start"
                style={{ gap: px(14), fontSize: px(18), lineHeight: 1.4 }}
              >
                <Badge n={p.index + 1} size={30} />
                <span style={{ paddingTop: px(3) }}>
                  <Editable
                    value={p.text}
                    at={{ kind: "point", themeId: slide.themeId, index: p.index }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </div>
        {notes && (
          <div className="flex min-w-0 flex-col" style={{ gap: px(14) }}>
            <p
              className="font-bold uppercase"
              style={{ fontSize: px(13), letterSpacing: ".12em", color: c("muted") }}
            >
              {words.fromWall}
              {slide.moreNotes > 0 && (
                <span className="font-normal normal-case tracking-normal">
                  {" "}
                  · {words.more(slide.moreNotes)}
                </span>
              )}
            </p>
            <ul
              className="grid min-h-0 grid-cols-3 content-start overflow-hidden"
              style={{ gap: px(16), padding: px(6) }}
            >
              {slide.notes.map((n, i) => (
                <PostIt key={n.id} note={n} index={i} size={1} />
              ))}
            </ul>
          </div>
        )}
      </div>
      <WhenFilled value={slide.soWhat}>
        <SoWhat label={words.soWhat}>
          <Editable
            value={slide.soWhat}
            at={{ kind: "themeStory", themeId: slide.themeId, field: "soWhat" }}
          />
        </SoWhat>
      </WhenFilled>
    </Frame>
  );
}
