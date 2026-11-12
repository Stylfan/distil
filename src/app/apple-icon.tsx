import { ImageResponse } from "next/og";
import { MarkImage } from "./icon";

/** The icon an iPhone shows when Distil is added to the home screen. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<MarkImage size={180} />, size);
}
