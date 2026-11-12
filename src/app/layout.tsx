import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import "./globals.css";

// Inter is served from the repository (SIL OFL, src/app/fonts/OFL.txt): nothing is fetched from outside.
const inter = localFont({
  src: [{ path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: { default: "Distil", template: "%s · Distil" },
    description: t("tagline"),
    // Opened from the home screen on an iPhone: full screen, with the name under the icon.
    appleWebApp: { capable: true, title: "Distil", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: "#F7F6F3", width: "device-width", initialScale: 1 };

/** The document shell shared by the signed-in pages and the sign-in pages. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  const messages = await getMessages();
  return (
    <html lang="da" className={inter.variable}>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            {t("skipToContent")}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
