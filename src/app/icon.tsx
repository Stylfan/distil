import { ImageResponse } from "next/og";

/**
 * Distil's icon in the sizes a phone asks for when it is added to the
 * home screen (192 and 512) and as the favicon (32): the funnel and its
 * bronze drop on paper. Drawn by Next.js itself, so no image files and no
 * library.
 */

const SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export function MarkImage({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F6F3",
      }}
    >
      <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 28 28">
        <path
          d="M5 6 H23 L16 14.5 V19 L12 21 V14.5 Z"
          fill="none"
          stroke="#1F2D33"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="24.5" r="2.3" fill="#A88E6E" />
      </svg>
    </div>
  );
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const size = Number(await id) || 192;
  return new ImageResponse(<MarkImage size={size} />, { width: size, height: size });
}
