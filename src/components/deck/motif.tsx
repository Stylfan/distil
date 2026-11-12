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
  papir: (place) => {
    const [x, y] = place === "closing" ? [0, 720] : place === "quote" ? [1280, 720] : [1280, 0];
    return (
      <g fill="none" stroke={c("accent")} strokeWidth="1.6">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={(place === "quote" ? 90 : 220) + i * 46}
            opacity={0.9 - i * 0.15}
          />
        ))}
        {place !== "quote" && (
          <circle
            cx={place === "closing" ? 330 : 950}
            cy={place === "closing" ? 470 : 250}
            r="14"
            fill={c("accent")}
            stroke="none"
          />
        )}
      </g>
    );
  },
  dis: (place) => {
    const left = place === "closing";
    const x = left ? 160 : place === "quote" ? 1200 : 1060;
    const y = place === "quote" ? 640 : 380;
    const r = place === "quote" ? 110 : 230;
    return (
      <g>
        <circle cx={x} cy={y - r * 0.35} r={r} fill={c("accent")} opacity=".28" />
        <circle
          cx={x + (left ? 1 : -1) * r * 0.55}
          cy={y + r * 0.25}
          r={r * 0.8}
          fill={c("brand")}
          opacity=".14"
        />
        <circle
          cx={x + (left ? -1 : 1) * r * 0.2}
          cy={y + r * 0.45}
          r={r * 0.55}
          fill={c("accent")}
          opacity=".4"
        />
      </g>
    );
  },
  ler: (place) => {
    const flip = place === "closing" ? -1 : 1;
    const base = place === "quote" ? 720 : 720;
    const h = place === "quote" ? 0.45 : 1;
    const hill = (lift: number, spread: number) =>
      `M${640 - flip * 640} ${base} Q ${640 + flip * spread} ${base - lift * h} ${640 + flip * 640} ${base - lift * h * 0.6} L ${640 + flip * 640} ${base} Z`;
    return (
      <g transform={flip < 0 ? "" : ""}>
        <path d={hill(420, 260)} fill={c("soft")} />
        <path d={hill(300, 360)} fill={c("accent")} opacity=".55" />
        <path d={hill(180, 460)} fill={c("brand")} opacity=".8" />
      </g>
    );
  },
  grafit: (place) =>
    place === "quote" ? (
      <rect x="1180" y="0" width="100" height="720" fill={c("ink")} />
    ) : (
      <g>
        <rect x={place === "closing" ? 0 : 860} y="0" width="420" height="720" fill={c("deep")} />
        <g stroke={c("accent")} strokeWidth="2" opacity=".6">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line
              key={i}
              x1={(place === "closing" ? 0 : 860) + 40 + i * 48}
              y1="0"
              x2={(place === "closing" ? 0 : 860) + 40 + i * 48}
              y2="720"
            />
          ))}
        </g>
      </g>
    ),
  mos: (place) => {
    const [x, y, s] =
      place === "quote" ? [1180, 640, 0.45] : place === "closing" ? [180, 420, 1] : [1040, 360, 1];
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse rx="230" ry="110" transform="rotate(-35)" fill={c("accent")} opacity=".7" />
        <ellipse
          rx="190"
          ry="85"
          transform="rotate(25) translate(60 120)"
          fill={c("soft")}
          opacity=".55"
        />
        <ellipse
          rx="120"
          ry="52"
          transform="rotate(-70) translate(-150 40)"
          fill={c("accent")}
          opacity=".4"
        />
        <path
          d="M-200 140 C -60 40, 60 -40, 200 -160"
          fill="none"
          stroke={c("paper")}
          strokeWidth="3"
          opacity=".6"
        />
      </g>
    );
  },
  lenskjold: (place) => {
    const [x, y, r] =
      place === "quote"
        ? [1200, 640, 110]
        : place === "closing"
          ? [90, 420, 230]
          : [1040, 360, 260];
    return (
      <g fill="none" stroke={c("accent")} strokeLinecap="round">
        <circle
          cx={x}
          cy={y}
          r={r}
          strokeWidth="9"
          strokeDasharray={`${r * 5.4} ${r * 0.9}`}
          transform={`rotate(-20 ${x} ${y})`}
          opacity=".85"
        />
        <circle
          cx={x + 6}
          cy={y - 4}
          r={r - 14}
          strokeWidth="2.5"
          strokeDasharray={`${r * 4.6} ${r * 1.6}`}
          transform={`rotate(140 ${x} ${y})`}
          opacity=".5"
        />
      </g>
    );
  },
};
