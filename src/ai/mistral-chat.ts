import { ReadError } from "./errors";

/**
 * One call to Mistral's chat API that must answer with a JSON object, with
 * plain fetch (no SDK). Mistral is a French company and the API is served
 * from the EU (docs/subprocessors.md). Nothing that was sent or came back
 * is logged; a failure is reported only as a short code.
 */

export type MistralOptions = {
  key: string;
  model: string;
  /** The API's address; DISTIL_MISTRAL_URL may point at another of Mistral's EU endpoints. */
  base?: string;
  fetch?: typeof fetch;
};

type ChatAnswer = { choices?: { message?: { content?: unknown } }[] };

const DEFAULT_BASE = "https://api.mistral.ai";
const TIMEOUT_MS = 90_000;

export async function mistralJson(options: MistralOptions, messages: unknown[]): Promise<unknown> {
  const call = options.fetch ?? fetch;
  const endpoint = `${(options.base || DEFAULT_BASE).replace(/\/+$/, "")}/v1/chat/completions`;
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
        messages,
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
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new ReadError("unreadable");
  }
}

/** The settings for Mistral from the environment, or null without a key. */
export function mistralFromEnv(env: NodeJS.ProcessEnv = process.env): MistralOptions | null {
  const key = env.MISTRAL_API_KEY?.trim();
  if (!key) return null;
  return {
    key,
    model: env.DISTIL_MISTRAL_MODEL?.trim() || "mistral-medium-latest",
    base: env.DISTIL_MISTRAL_URL?.trim(),
  };
}
