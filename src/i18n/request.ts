import { getRequestConfig } from "next-intl/server";

/**
 * Danish is the language of the product. The messages live in one file so
 * an English translation can be added beside it without touching the code.
 */
export default getRequestConfig(async () => ({
  locale: "da",
  timeZone: "Europe/Copenhagen",
  messages: (await import("../../messages/da.json")).default,
}));
