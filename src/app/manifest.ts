import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Lets a phone add Distil to its home screen and open it like an app,
 * full screen, straight to the workshops. The same address works on the
 * computer; the page adapts to the screen it is on.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("app");
  return {
    name: "Distil",
    short_name: "Distil",
    description: t("tagline"),
    lang: "da",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#F7F6F3",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
