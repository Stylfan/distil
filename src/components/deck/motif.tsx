import type { Look } from "@/domain/story";
import { c } from "./look";

/**
 * The shapes that give each colour theme its character, drawn on the
 * cover, the chapter breakers, the quote and the closing slide. Pure
 * decoration in the theme's own colours, in the slide's 1280×720 space.
 */

export type MotifPlace = "cover" | "section" | "quote" | "closing";

export function Motif({ look, place }: { look: Look; place: MotifPlace }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1280 720"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {SHAPES[look](place)}
    </svg>
  );
}

// A shape in the other dark colour of the theme than the slide it sits on.
const fillOf = (place: MotifPlace) => (place === "section" ? c("brand") : c("deep"));

const SHAPES: Record<Look, (place: MotifPlace) => React.ReactNode> = {
  kobolt: (place) =>
    place === "quote" ? (
      <>
        <polygon points="1280,0 1280,220 1060,0" fill={c("brand")} />
        <circle cx="1180" cy="640" r="140" fill={c("soft")} />
      </>
    ) : (
      <>
        <polygon
          points={place === "closing" ? "0,720 0,300 420,720" : "1280,0 1280,420 860,0"}
          fill={fillOf(place)}
        />
        <circle
          cx={place === "closing" ? 1200 : 1150}
          cy={place === "closing" ? 40 : 580}
          r={place === "section" ? 190 : place === "closing" ? 170 : 220}
          fill={fillOf(place)}
        />
        <circle
          cx={place === "closing" ? 1200 : 1150}
          cy={place === "closing" ? 40 : 580}
          r="70"
          fill={c("accent")}
          opacity=".9"
        />
      </>
    ),
  aubergine: (place) => (
    <g>
      <g fill="none" stroke={c("accent")} strokeWidth="2.5" opacity={place === "quote" ? 0.5 : 0.6}>
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={
              place === "closing"
                ? `M${-40 + i * 50} 760 C ${200 + i * 50} 420, ${420 + i * 40} 700, ${700 + i * 40} ${-40 + i * 30}`
                : `M${680 + i * 50} 760 C ${880 + i * 50} 460, ${1020 + i * 40} 700, ${1300 + i * 30} ${60 + i * 40}`
            }
          />
        ))}
      </g>
      {place !== "quote" && (
        <circle
          cx={place === "closing" ? 1150 : 1090}
          cy={place === "closing" ? 100 : 260}
          r={place === "section" ? 90 : place === "closing" ? 80 : 120}
          fill={c("accent")}
        />
      )}
    </g>
  ),
  petrol: (place) => {
    const [x, y, r] =
      place === "quote"
        ? [1240, 640, 120]
        : place === "closing"
          ? [220, 360, 250]
          : [1010, 360, 270];
    return (
      <g>
        <g fill="none" stroke={c("accent")} strokeWidth="3">
          <circle cx={x} cy={y} r={r} opacity=".3" />
          <circle cx={x} cy={y} r={r * 0.75} opacity=".55" />
          <circle cx={x} cy={y} r={r * 0.5} />
        </g>
        <circle cx={x} cy={y} r={r * 0.24} fill={c("accent")} />
      </g>
    );
  },
  skov: (place) => {
    const x = place === "closing" ? 0 : 1280;
    const s = place === "closing" ? 1 : -1;
    return place === "quote" ? (
      <path d="M1280 720 L1280 520 A200 200 0 0 0 1080 720 Z" fill={c("soft")} />
    ) : (
      <g>
        <path
          d={`M${x} 720 L${x} 200 A520 520 0 0 ${s > 0 ? 1 : 0} ${x + s * 520} 720 Z`}
          fill={fillOf(place)}
        />
        <path
          d={`M${x} 720 L${x} 430 A290 290 0 0 ${s > 0 ? 1 : 0} ${x + s * 290} 720 Z`}
          fill={c("accent")}
          opacity=".85"
        />
        <circle cx={x + s * 330} cy="150" r="46" fill={c("accent")} />
      </g>
    );
  },
  sand: (place) => (
    <g fill="none" stroke={c("accent")} strokeWidth="2" opacity={place === "quote" ? 0.5 : 0.75}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={i}
          cx={place === "closing" ? 0 : 1280}
          cy={place === "quote" ? 720 : 360}
          r={place === "quote" ? 60 + i * 34 : 140 + i * 70}
        />
      ))}
    </g>
  ),
};
