import type { Slide } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import type { Look } from "@/domain/story";
import { NOTE_EDGE } from "@/components/workshop/colours";
import { Editable } from "./editable";
import { c } from "./look";
import { Frame, Kicker, px } from "./slide-parts";
import {
  ListSlide,
  ActionsSlide,
  DiagramSlide,
  ShiftsSlide,
  TranscriptSlide,
  VotesSlide,
} from "./slide-lists";
import { SummarySlide, ThemeMapSlide, ThemeSlide } from "./slide-story";

/**
 * One slide, 16:9, in the deck's colour theme. The cover, the chapter
 * breakers, the quote and the closing slide are here; the slides that tell
 * the findings are in slide-story, the lists in slide-lists.
 */

export type SlideProps = {
  number: number;
  total: number;
  words: DeckWords;
  look: Look;
  /** The workshop and its date, at the foot of every slide. */
  footer: string;
};

export function SlideView({ slide, ...props }: SlideProps & { slide: Slide }) {
  const { words } = props;
  switch (slide.kind) {
    case "cover":
      return (
        <Frame {...props} tone="brand" motif="cover" footer={slide.date}>
          <div
            className="flex flex-1 flex-col justify-end"
            style={{ paddingBottom: px(50), maxWidth: px(720) }}
          >
            <Kicker light>{words.coverKicker}</Kicker>
            <h1
              className="font-extrabold"
              style={{
                fontSize: px(62),
                lineHeight: 1.05,
                letterSpacing: "-.02em",
                marginTop: px(18),
              }}
            >
              <Editable value={slide.title} at={{ kind: "workshopTitle" }} />
            </h1>
            {slide.tagline && (
              <p
                style={{
                  fontSize: px(22),
                  lineHeight: 1.4,
                  marginTop: px(20),
                  color: "rgba(255,255,255,.8)",
                }}
              >
                <Editable value={slide.tagline} at={{ kind: "story", field: "tagline" }} />
              </p>
            )}
          </div>
        </Frame>
      );
    case "section":
      return (
        <Frame {...props} tone="deep" motif="section">
          <div className="flex flex-1 flex-col justify-center">
            <p
              className="font-extrabold"
              style={{ fontSize: px(120), lineHeight: 1, color: c("accent") }}
            >
              {String(slide.number).padStart(2, "0")}
            </p>
            <h1
              className="font-extrabold"
              style={{ fontSize: px(60), lineHeight: 1.05, marginTop: px(14) }}
            >
              {words.chapters[slide.chapter]}
            </h1>
            <p style={{ fontSize: px(20), marginTop: px(16), color: "rgba(255,255,255,.7)" }}>
              {words.facts(slide.facts, slide.chapter)}
            </p>
          </div>
        </Frame>
      );
    case "quote": {
      const n = slide.note;
      return (
        <Frame {...props} motif="quote">
          <div className="flex flex-1 flex-col justify-center" style={{ maxWidth: px(1000) }}>
            <Kicker>{words.quoteKicker}</Kicker>
            <span
              aria-hidden
              className="font-extrabold"
              style={{
                fontSize: px(150),
                lineHeight: 0.8,
                height: px(80),
                color: c("brand"),
                marginTop: px(24),
              }}
            >
              “
            </span>
            <blockquote
              className="font-bold"
              style={{ fontSize: px(46), lineHeight: 1.2, letterSpacing: "-.01em" }}
            >
              {n.text}
            </blockquote>
            <p
              className="flex items-center"
              style={{ gap: px(10), marginTop: px(28), fontSize: px(17), color: c("muted") }}
            >
              <span
                style={{
                  width: px(16),
                  height: px(16),
                  background: n.colour === "none" ? "transparent" : NOTE_EDGE[n.colour],
                  border: `1px solid ${NOTE_EDGE[n.colour]}`,
                }}
              />
              {words.photo(n.photo)}
              {(n.votes ?? 0) > 0 && ` · ${words.votesTotal(n.votes ?? 0)}`}
            </p>
          </div>
        </Frame>
      );
    }
    case "closing":
      return (
        <Frame {...props} tone="brand" motif="closing" footer={slide.date}>
          <div className="flex flex-1 flex-col items-end justify-center text-right">
            <h1
              className="font-extrabold"
              style={{
                fontSize: px(58),
                lineHeight: 1.08,
                maxWidth: px(760),
                letterSpacing: "-.02em",
              }}
            >
              <Editable
                value={slide.line || words.closing}
                at={{ kind: "story", field: "closing" }}
              />
            </h1>
            <p style={{ fontSize: px(20), marginTop: px(18), color: "rgba(255,255,255,.75)" }}>
              {slide.title}
            </p>
          </div>
        </Frame>
      );
    case "summary":
      return <SummarySlide slide={slide} {...props} />;
    case "themeMap":
      return <ThemeMapSlide slide={slide} {...props} />;
    case "theme":
      return <ThemeSlide slide={slide} {...props} />;
    case "list":
      return <ListSlide slide={slide} {...props} />;
    case "shifts":
      return <ShiftsSlide slide={slide} {...props} />;
    case "actions":
      return <ActionsSlide slide={slide} {...props} />;
    case "votes":
      return <VotesSlide slide={slide} {...props} />;
    case "diagram":
      return <DiagramSlide slide={slide} {...props} />;
    case "transcript":
      return <TranscriptSlide slide={slide} {...props} />;
  }
}
