import { parseReading } from "@/domain/reading";
import { ReadError } from "./errors";
import { mistralJson, type MistralOptions } from "./mistral-chat";
import { READ_PHOTO_PROMPT } from "./prompt";
import type { Reader } from "./reader";

/** Reading a photo with Mistral's vision model: the photo as a data URL, the notes as JSON. */
export function mistralReader(options: MistralOptions): Reader {
  return {
    async read(image, mime) {
      const answer = await mistralJson(options, [
        { role: "system", content: READ_PHOTO_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this photo." },
            { type: "image_url", image_url: `data:${mime};base64,${image.toString("base64")}` },
          ],
        },
      ]);
      const items = parseReading(answer);
      if (!items) throw new ReadError("unreadable");
      return items;
    },
  };
}
