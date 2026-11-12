import { currentUser } from "@/auth/session";
import { DECK_WORDS } from "@/domain/deck-words";
import { formatDay } from "@/lib/dates";
import { loadDeck } from "@/lib/deck-page";
import { buildPptx } from "@/lib/pptx/build";

/**
 * The presentation as a PowerPoint file, built on request from the same
 * slides as the page and never stored.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await params;
  const page = await loadDeck(user.id, id);
  if (!page?.slides) return new Response(null, { status: 404 });
  const file = await buildPptx({
    slides: page.slides,
    words: DECK_WORDS[page.language],
    title: page.workshop.name,
    footer: `${page.workshop.name} · ${formatDay(page.workshop.heldOn, page.language)}`,
    look: page.look,
  });
  // A file name from the workshop's name, in letters a file system takes everywhere.
  const name =
    page.workshop.name
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "distil";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${name}.pptx"; filename*=UTF-8''${encodeURIComponent(page.workshop.name)}.pptx`,
      "Cache-Control": "no-store",
    },
  });
}
