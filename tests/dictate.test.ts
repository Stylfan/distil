import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { mistralDictation } from "@/ai/dictate";
import { users } from "@/db/schema";
import { limits, type Limits } from "@/domain/limits";
import { LimitReached } from "@/services/errors";
import { releaseDictation, reserveDictation } from "@/services/limits";
import { eq } from "drizzle-orm";
import { freshDb } from "./db";
import { seedUser } from "./helpers";

/**
 * Speaking instead of typing: the recording goes to Mistral's transcription
 * and only the text comes back; every recording counts against the day.
 */

describe("Mistral's transcription", () => {
  it("is sent the recording with its language, and gives back the text", async () => {
    let sent: FormData | undefined;
    const dictation = mistralDictation({
      key: "k",
      model: "m",
      fetch: (async (url: string, init: RequestInit) => {
        expect(url).toBe("https://api.mistral.ai/v1/audio/transcriptions");
        sent = init.body as FormData;
        return new Response(JSON.stringify({ text: "  Vi skal   prioritere tre ting. " }));
      }) as typeof fetch,
    });
    const text = await dictation.transcribe(
      new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }),
      "da",
    );
    expect(text).toBe("Vi skal prioritere tre ting.");
    expect(sent!.get("model")).toBe("voxtral-mini-latest");
    expect(sent!.get("language")).toBe("da");
    expect(sent!.get("file")).toBeInstanceOf(Blob);
  });

  it("fails plainly when Mistral does not answer with text", async () => {
    const failing = mistralDictation({
      key: "k",
      model: "m",
      fetch: (async () => new Response("no", { status: 500 })) as typeof fetch,
    });
    await expect(failing.transcribe(new Blob([]), "da")).rejects.toThrow("provider");
  });
});

describe("the daily limits on speaking", () => {
  let db: Db;
  let alice: string;
  const config: Limits = {
    ...limits({} as NodeJS.ProcessEnv),
    dictationsPerAccount: 2,
    dictationCeiling: 3,
  };

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
  });

  it("counts each recording for the account, and a failed one is given back", async () => {
    await reserveDictation(db, alice, 1000, config);
    await reserveDictation(db, alice, 1000, config);
    await expect(reserveDictation(db, alice, 1000, config)).rejects.toThrow(LimitReached);
    await releaseDictation(db, alice, 1000);
    await reserveDictation(db, alice, 1000, config);
    const [row] = await db.select().from(users).where(eq(users.id, alice));
    expect(row!.dictationsOnDay).toBe(2);
  });

  it("stops the whole installation at its ceiling", async () => {
    const bob = await seedUser(db, "bob@example.com");
    await reserveDictation(db, alice, 1000, config);
    await reserveDictation(db, alice, 1000, config);
    await reserveDictation(db, bob, 1000, config);
    await expect(reserveDictation(db, bob, 1000, config)).rejects.toThrow("daily");
  });
});
