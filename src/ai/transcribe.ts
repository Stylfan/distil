import { ReadError } from "./errors";
import { mistralFromEnv, mistralJson, type MistralOptions } from "./mistral-chat";

/**
 * Reading a page of writing, such as a handwritten agenda, into plain text
 * with Mistral's vision model. The photo is sent, the text comes back, and
 * neither is stored or logged: the facilitator sees the text and decides
 * what to keep.
 */

export const TRANSCRIBE_PROMPT = `You transcribe a photo of a page of writing, usually the agenda of a workshop: handwritten notes, a flip chart or a printed page.

Answer with JSON only: {"text": "..."}

Write the text line by line as it stands, in its own language. Keep times, numbers and the order. Do not translate, correct, summarise or add anything. Never invent text: where a word cannot be read, write [?]. If there is no writing, answer {"text": ""}.`;

export type Transcriber = { transcribe(image: Buffer, mime: string): Promise<string> };

export function mistralTranscriber(options: MistralOptions): Transcriber {
  return {
    async transcribe(image, mime) {
      const answer = (await mistralJson(options, [
        { role: "system", content: TRANSCRIBE_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this page." },
            { type: "image_url", image_url: `data:${mime};base64,${image.toString("base64")}` },
          ],
        },
      ])) as { text?: unknown } | null;
      if (typeof answer?.text !== "string") throw new ReadError("unreadable");
      return answer.text.replace(/\r/g, "").trim().slice(0, 6000);
    },
  };
}

export const fakeTranscriber: Transcriber = {
  async transcribe() {
    return "09.00 Velkomst\n09.15 Hvorfor er vi her?\n10.00 Værdier\n11.00 Strategi\n12.00 Frokost";
  },
};

export function getTranscriber(env: NodeJS.ProcessEnv = process.env): Transcriber {
  if (env.DISTIL_READER === "fake") return fakeTranscriber;
  const options = mistralFromEnv(env);
  if (!options) return { transcribe: () => Promise.reject(new ReadError("notConfigured")) };
  return mistralTranscriber(options);
}
