/**
 * The text of an agenda file, read in the browser: Word (.docx),
 * PowerPoint (.pptx) or plain text. The file never leaves the computer;
 * only the text, which the facilitator sees and can change, is saved.
 * Word and PowerPoint files are zip archives of XML, read here with the
 * browser's own decompression, so no library is needed.
 */

export type AgendaFileError = "type" | "unreadable";

const MAX_FILE = 25 * 1024 * 1024;
const MAX_TEXT = 6000;

export async function agendaFromFile(file: File): Promise<string | AgendaFileError> {
  if (file.size > MAX_FILE) return "unreadable";
  const name = file.name.toLowerCase();
  try {
    if (/\.(txt|md|text)$/.test(name) || file.type.startsWith("text/")) {
      return tidy(await file.text());
    }
    if (name.endsWith(".docx")) {
      const entries = await unzip(file, (n) => n === "word/document.xml");
      const xml = entries.get("word/document.xml");
      return xml ? tidy(textOf(xml, "w:p", "w:t")) : "unreadable";
    }
    if (name.endsWith(".pptx")) {
      const entries = await unzip(file, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
      const slides = [...entries.entries()]
        .sort(([a], [b]) => slideNumber(a) - slideNumber(b))
        .map(([, xml]) => textOf(xml, "a:p", "a:t"))
        .filter((t) => t.trim());
      return slides.length ? tidy(slides.join("\n\n")) : "unreadable";
    }
    return "type";
  } catch {
    return "unreadable";
  }
}

const slideNumber = (name: string) => Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);

function tidy(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}

/** The text of each paragraph, one per line, from Office XML. */
function textOf(xml: string, paragraph: string, run: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = [...doc.getElementsByTagName(paragraph)];
  return paragraphs
    .map((p) =>
      [...p.getElementsByTagName(run)]
        .map((r) => r.textContent ?? "")
        .join("")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

/** The wanted entries of a zip archive, as text. Only "stored" and "deflate" entries. */
async function unzip(file: Blob, wanted: (name: string) => boolean): Promise<Map<string, string>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("bad zip");
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (!wanted(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) out.set(name, decoder.decode(data));
    else if (method === 8) out.set(name, await inflate(data));
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}
