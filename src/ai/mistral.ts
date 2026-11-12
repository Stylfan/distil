import { parseReading } from "@/domain/reading";
import { READ_PHOTO_PROMPT } from "./prompt";
import { ReadError } from "./errors";
import type { Reader } from "./reader";

/**
 * Reading a photo with Mistral's vision model through its chat API, with
 * plain fetch (no SDK). Mistral is a French company and the API is served
 * from the EU (docs/subprocessors.md). Nothing about the photo or the
 * answer is logged; a failure is reported only as a short code.
 */

const DEFAULT_BASE = "https://api.mistral.ai";
const TIMEOUT_MS = 90_000;

type ChatAnswer = { choices?: { message?: { content?: unknown } }[] };

export function mistralReader(options: {
  key: string;
  model: string;
  /** The API's address; DISTIL_MISTRAL_URL may point at another of Mistral's EU endpoints. */
  base?: string;
  fetch?: typeof fetch;
}): Reader {
  const call = options.fetch ?? fetch;
  const endpoint = `${(options.base || DEFAULT_BASE).replace(/\/+$/, "")}/v1/chat/completions`;
  return {
    async read(image, mime) {
      let response: Response;
      try {
        response = await call(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: READ_PHOTO_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: "Transcribe this photo." },
                  {
                    type: "image_url",
                    image_url: `data:${mime};base64,${image.toString("base64")}`,
                  },
                ],
              },
            ],
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new ReadError("provider");
      }
      if (!response.ok) {
        // The status only: the body may echo what was sent.
        console.error(`mistral: status ${response.status}`);
        throw new ReadError("provider");
      }
      const body = (await response.json().catch(() => null)) as ChatAnswer | null;
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new ReadError("unreadable");
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new ReadError("unreadable");
      }
      const items = parseReading(parsed);
      if (!items) throw new ReadError("unreadable");
      return items;
    },
  };
}
