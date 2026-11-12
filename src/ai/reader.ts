import type { Reading } from "@/domain/reading";
import { ReadError } from "./errors";
import { fakeReader } from "./fake";
import { mistralReader } from "./mistral";
import { mistralFromEnv } from "./mistral-chat";

/**
 * The one door to the model. Everything that reads a photo goes through a
 * Reader, so tests use a fake and never call Mistral, and swapping the
 * model is a setting (DISTIL_MISTRAL_MODEL), not a code change.
 */
export type Reader = {
  read(image: Buffer, mime: string): Promise<Reading>;
};

/**
 * The reader for this installation: Mistral when a key is set;
 * DISTIL_READER=fake gives made-up notes for trying the app on a
 * development machine without a key.
 */
export function getReader(env: NodeJS.ProcessEnv = process.env): Reader {
  if (env.DISTIL_READER === "fake") return fakeReader;
  const options = mistralFromEnv(env);
  if (!options) return { read: () => Promise.reject(new ReadError("notConfigured")) };
  return mistralReader(options);
}

export { ReadError, type ReadFailure } from "./errors";
