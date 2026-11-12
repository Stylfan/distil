import { ImageResponse } from "next/og";

/**
 * Distil's icon in the sizes a phone asks for when it is added to the
 * home screen (192 and 512) and as the favicon (32): the drop in its
 * circle and the bronze dot, on paper. Drawn by Next.js itself, so no image files and no
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
      <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12.4" fill="none" stroke="#1F2D33" strokeWidth="1.6" />
        <path
          d="M14 6 C 18.6 11, 18.6 15, 14 19.4 C 9.4 15, 9.4 11, 14 6 Z"
          fill="none"
          stroke="#1F2D33"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="22.6" r="1.9" fill="#A88E6E" />
      </svg>
    </div>
  );
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const size = Number(await id) || 192;
  return new ImageResponse(<MarkImage size={size} />, { width: size, height: size });
}
