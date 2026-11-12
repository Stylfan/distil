import { describe, expect, it } from "vitest";
import { mistralReader } from "@/ai/mistral";
import { getReader } from "@/ai/reader";
import { checkImage, jpegSize } from "@/domain/image";
import { dayKey, limits } from "@/domain/limits";
import { MAX_ITEMS_PER_PHOTO, inReadingOrder, parseReading, toColour } from "@/domain/reading";
import { sameOrigin } from "@/lib/same-origin";
import { fakeJpeg } from "./helpers";

const env = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;

/**
 * The pure parts of reading a photo: what the server accepts as a photo,
 * how a model's answer is turned into notes (leniently, and clamped), and
 * how Mistral is called, with a stand-in for its API so no test ever
 * reaches it.
 */

describe("a photo", () => {
  it("is a JPEG whose size is read from its own header", () => {
    expect(jpegSize(fakeJpeg(1234, 567))).toEqual({ width: 1234, height: 567 });
    expect(checkImage(fakeJpeg(2000, 1500))).toMatchObject({ ok: true, mime: "image/jpeg" });
  });

  it("is refused when it is something else, whatever it is called", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(checkImage(png)).toEqual({ ok: false, reason: "type" });
    expect(checkImage(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toEqual({
      ok: false,
      reason: "type",
    });
    expect(checkImage(Buffer.alloc(0))).toEqual({ ok: false, reason: "size" });
    expect(checkImage(Buffer.alloc(5 * 1024 * 1024))).toEqual({ ok: false, reason: "size" });
  });
});

describe("a model's answer", () => {
  it("becomes notes, with words for colours and fractions for places", () => {
    const items = parseReading({
      items: [
        { kind: "note", text: "  For mange\n systemer ", colour: "Yellow", x: 0.25, y: 0.5 },
        { kind: "Heading", text: "Onboarding", color: "grøn", x: 400, y: 30 },
        { text: "Uden noget andet" },
      ],
    });
    expect(items).toEqual([
      {
        kind: "note",
        text: "For mange systemer",
        colour: "yellow",
        x: 250,
        y: 500,
        unsure: false,
        alternatives: [],
        votes: 0,
      },
      {
        kind: "heading",
        text: "Onboarding",
        colour: "green",
        x: 400,
        y: 30,
        unsure: false,
        alternatives: [],
        votes: 0,
      },
      {
        kind: "note",
        text: "Uden noget andet",
        colour: "none",
        x: 500,
        y: 500,
        unsure: false,
        alternatives: [],
        votes: 0,
      },
    ]);
  });

  it("drops what does not fit rather than guessing, and clamps the rest", () => {
    const items = parseReading({
      items: [
        { text: "" },
        { text: 42 },
        "en streng",
        { text: "Udenfor", x: -3, y: 4000, kind: "script", colour: "<b>" },
        { text: "Måske", unsure: true, alternatives: ["Måske", "Mæske", "a", "b", "c"] },
      ],
    });
    expect(items).toEqual([
      {
        kind: "note",
        text: "Udenfor",
        colour: "none",
        x: 0,
        y: 1000,
        unsure: false,
        alternatives: [],
        votes: 0,
      },
      {
        kind: "note",
        text: "Måske",
        colour: "none",
        x: 500,
        y: 500,
        unsure: true,
        alternatives: ["Mæske", "a", "b"],
        votes: 0,
      },
    ]);
    expect(parseReading({ notes: [] })).toBeNull();
    expect(parseReading("ikke json")).toBeNull();
    const many = parseReading({
      items: Array.from({ length: 400 }, (_, i) => ({ text: `n${i}` })),
    });
    expect(many).toHaveLength(MAX_ITEMS_PER_PHOTO);
  });

  it("knows Danish colour words", () => {
    expect(["gul", "lyserød", "blå", "lilla", "hvid", "magenta"].map(toColour)).toEqual([
      "yellow",
      "pink",
      "blue",
      "purple",
      "white",
      "pink",
    ]);
  });

  it("is put in reading order: top to bottom in bands, left to right", () => {
    const at = (x: number, y: number) => ({
      kind: "note" as const,
      text: `${x},${y}`,
      colour: "none" as const,
      x,
      y,
      unsure: false,
      alternatives: [],
      votes: 0,
    });
    expect(
      inReadingOrder([at(800, 100), at(100, 110), at(500, 600), at(100, 590)]).map((i) => i.text),
    ).toEqual(["100,110", "800,100", "100,590", "500,600"]);
  });
});

describe("Mistral", () => {
  const answer = (content: unknown, status = 200) =>
    (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status,
      })) as typeof fetch;

  it("is sent the photo as a data URL with the key, and its JSON becomes notes", async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const reader = mistralReader({
      key: "test-key",
      model: "test-model",
      fetch: (async (url: string, init: RequestInit) => {
        sent = { url, init };
        return answer(JSON.stringify({ items: [{ text: "Hej", colour: "pink" }] }))(url, init);
      }) as typeof fetch,
    });
    const { items, diagram } = await reader.read(Buffer.from([1, 2, 3]), "image/jpeg");
    expect(items).toMatchObject([{ text: "Hej", colour: "pink" }]);
    expect(diagram).toBeNull();
    expect(sent!.url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect((sent!.init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(sent!.init.body));
    expect(body.model).toBe("test-model");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content[1].image_url).toBe("data:image/jpeg;base64,AQID");
  });

  it("fails with a short code, never with what came back", async () => {
    const read = (f: typeof fetch) =>
      mistralReader({ key: "k", model: "m", fetch: f }).read(Buffer.from([1]), "image/jpeg");
    await expect(read(answer("x", 500))).rejects.toThrow("provider");
    await expect(read(answer("ikke json"))).rejects.toThrow("unreadable");
    await expect(read(answer(JSON.stringify({ svar: "nej" })))).rejects.toThrow("unreadable");
    await expect(
      read((async () => Promise.reject(new Error("net"))) as typeof fetch),
    ).rejects.toThrow("provider");
  });

  it("is not reached without a key, and a fake is used only when asked for", async () => {
    await expect(getReader(env({})).read(Buffer.from([1]), "image/jpeg")).rejects.toThrow(
      "notConfigured",
    );
    expect(
      (await getReader(env({ DISTIL_READER: "fake" })).read(Buffer.from([1]), "image/jpeg")).items
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("the limits", () => {
  it("default to 10 photos an account and 300 a day, and may be set", () => {
    expect(limits(env({}))).toMatchObject({ allowance: 10, dailyCeiling: 300 });
    expect(
      limits(env({ DISTIL_PHOTO_ALLOWANCE: "25", DISTIL_DAILY_PHOTO_LIMIT: "-4" })),
    ).toMatchObject({
      allowance: 25,
      dailyCeiling: 300,
    });
    expect(dayKey(Date.UTC(2026, 10, 12, 23, 59))).toBe("2026-11-12");
  });
});

describe("a request that changes data", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://distil.local/api/photos/x/read", { method: "POST", headers });

  it("must come from the app's own pages", () => {
    expect(
      sameOrigin(request({ origin: "http://distil.local", host: "distil.local" }), env({})),
    ).toBe(true);
    expect(
      sameOrigin(request({ origin: "https://ond.example", host: "distil.local" }), env({})),
    ).toBe(false);
    expect(sameOrigin(request({ host: "distil.local" }), env({}))).toBe(false);
    expect(
      sameOrigin(
        request({ origin: "https://distil.example.dk", host: "intern:3000" }),
        env({ DISTIL_URL: "https://distil.example.dk" }),
      ),
    ).toBe(true);
  });
});
