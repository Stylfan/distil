import { ReadError } from "./errors";
import { mistralFromEnv, type MistralOptions } from "./mistral-chat";

/**
 * Speech to text with Mistral's own transcription model (Voxtral), so a
 * facilitator can talk instead of typing. Mistral is already Distil's one
 * third party and serves the API from the EU; the browser's built-in
 * speech recognition would send the audio elsewhere. The recording is
 * sent, the text comes back, and neither is stored or logged.
 */

export type Dictation = { transcribe(audio: Blob, language: "da" | "en"): Promise<string> };

const DEFAULT_BASE = "https://api.mistral.ai";
const DEFAULT_MODEL = "voxtral-mini-latest";
const TIMEOUT_MS = 60_000;

export function mistralDictation(options: MistralOptions & { audioModel?: string }): Dictation {
  return {
    async transcribe(audio, language) {
      const call = options.fetch ?? fetch;
      const form = new FormData();
      form.append("model", options.audioModel || DEFAULT_MODEL);
      form.append("language", language);
      form.append("file", audio, "speech.webm");
      let response: Response;
      try {
        response = await call(
          `${(options.base || DEFAULT_BASE).replace(/\/+$/, "")}/v1/audio/transcriptions`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${options.key}`, Accept: "application/json" },
            body: form,
            signal: AbortSignal.timeout(TIMEOUT_MS),
          },
        );
      } catch {
        throw new ReadError("provider");
      }
      if (!response.ok) {
        // The status only: nothing of what was said.
        console.error(`mistral audio: status ${response.status}`);
        throw new ReadError("provider");
      }
      const body = (await response.json().catch(() => null)) as { text?: unknown } | null;
      if (typeof body?.text !== "string") throw new ReadError("unreadable");
      return body.text.replace(/\s+/g, " ").trim().slice(0, 4000);
    },
  };
}

export const fakeDictation: Dictation = {
  async transcribe() {
    return "Vi skulle blive enige om retningen for næste år.";
  },
};

export function getDictation(env: NodeJS.ProcessEnv = process.env): Dictation {
  if (env.DISTIL_READER === "fake") return fakeDictation;
  const options = mistralFromEnv(env);
  if (!options) return { transcribe: () => Promise.reject(new ReadError("notConfigured")) };
  return mistralDictation({ ...options, audioModel: env.DISTIL_MISTRAL_AUDIO_MODEL?.trim() });
}
