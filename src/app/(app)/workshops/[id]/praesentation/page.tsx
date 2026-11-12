import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { DeckEditor } from "@/components/deck/deck-editor";
import { DeckToolbar } from "@/components/deck/deck-toolbar";
import { lookStyle } from "@/components/deck/look";
import { SlideView } from "@/components/deck/slide";
import { WorkshopTabs } from "@/components/workshop/workshop-tabs";
import { PageHeader } from "@/components/ui/layout";
import { DECK_WORDS } from "@/domain/deck-words";
import { formatDay } from "@/lib/dates";
import { loadDeck } from "@/lib/deck-page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const page = await loadDeck(user.id, id);
  // The title becomes the PDF's file name when it is saved.
  return { title: page?.workshop.name };
}

/** One page of the PDF per slide, 16:9, and nothing but the slides. */
const PRINT = `@page { size: 13.333in 7.5in; margin: 0; }
@media print {
  .deck-slide { width: 13.333in !important; height: 7.5in !important; aspect-ratio: auto !important; break-after: page; }
  .deck-slide:last-child { break-after: auto; }
}`;

/**
 * The presentation: every slide, one under the other, as it will look in
 * the PDF. Printing leaves out everything but the slides.
 */
export default async function DeckPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const page = await loadDeck(user.id, id);
  if (!page) notFound();
  const { workshop, slides, language, includeTranscript, outline, look, told, noteCount } = page;
  const t = await getTranslations("deck");
  const words = DECK_WORDS[language];

  return (
    <div className="flex flex-col gap-5 print:block">
      <style>{PRINT}</style>
      <PageHeader label={formatDay(workshop.heldOn)} title={workshop.name} />
      <WorkshopTabs workshopId={workshop.id} current="deck" />
      {!slides ? (
        <div className="flex max-w-2xl flex-col gap-3 rounded-lg border border-dashed border-hairline p-6 print:hidden">
          <h2 className="text-[16px] font-semibold">{t("emptyTitle")}</h2>
          <p className="text-[14px] leading-relaxed text-slate">{t("emptyBody")}</p>
          <Link
            href={`/workshops/${workshop.id}/disposition`}
            className="self-start text-[14px] underline underline-offset-4"
          >
            {t("toOutline")}
          </Link>
        </div>
      ) : (
        <>
          <DeckEditor
            workshop={{ id: workshop.id, name: workshop.name, heldOn: workshop.heldOn }}
            outline={outline!.content}
            version={outline!.version}
          >
            <DeckToolbar
              workshopId={workshop.id}
              includeTranscript={includeTranscript}
              told={told}
              look={look}
              summary={t("summary", { count: slides.length, language: t(`language.${language}`) })}
              noteCount={noteCount}
            />
            <div
              className="flex max-w-5xl flex-col gap-6 print:block print:max-w-none"
              style={lookStyle(look)}
            >
              {slides.map((slide, i) => (
                <SlideView
                  key={i}
                  slide={slide}
                  number={i + 1}
                  total={slides.length}
                  words={words}
                  look={look}
                  footer={`${workshop.name} · ${formatDay(workshop.heldOn, language)}`}
                />
              ))}
            </div>
          </DeckEditor>
        </>
      )}
    </div>
  );
}
