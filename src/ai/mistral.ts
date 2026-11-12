import { parsePhotoAnswer, parseReading } from "@/domain/reading";
import { ReadError } from "./errors";
import { mistralJson, type MistralOptions } from "./mistral-chat";
import { READ_PART_PROMPT, READ_PHOTO_PROMPT } from "./prompt";
import type { Reader } from "./reader";

/** Reading a photo with Mistral's vision model: the photo as a data URL; the notes and any drawing as JSON. */
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
      const reading = parsePhotoAnswer(answer);
      if (!reading) throw new ReadError("unreadable");
      return reading;
    },
    async readPart(image, mime) {
      const answer = await mistralJson(options, [
        { role: "system", content: READ_PART_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this part of the photo." },
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
