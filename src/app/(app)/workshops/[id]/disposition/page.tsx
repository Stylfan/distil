import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { OutlineEditor } from "@/components/outline/outline-editor";
import { AskDistil, MakeOutline } from "@/components/outline/outline-run";
import { QuestionCards } from "@/components/outline/question-cards";
import { WorkshopTabs } from "@/components/workshop/workshop-tabs";
import { PageHeader } from "@/components/ui/layout";
import { formatDay } from "@/lib/dates";
import { loadOutlinePage } from "@/lib/outline-page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const page = await loadOutlinePage(user.id, id);
  const t = await getTranslations("workshop");
  return { title: page ? `${t("tabOutline")} · ${page.workshop.name}` : undefined };
}

/**
 * The outline of a workshop: what Distil made of all the notes, shaped by
 * the facilitator, with Distil's questions and a field to ask for changes
 * beside it. On a phone this page is not where the work is done.
 */
export default async function OutlinePage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const page = await loadOutlinePage(user.id, id);
  if (!page) notFound();
  const { workshop, outline, notes, questionNotes } = page;
  const t = await getTranslations("outline");
  const noteCount = Object.keys(notes).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader label={formatDay(workshop.heldOn)} title={workshop.name} />
      <WorkshopTabs workshopId={workshop.id} current="outline" />
      {!outline ? (
        <div className="flex max-w-2xl flex-col gap-3 rounded-lg border border-dashed border-hairline p-6">
          <h2 className="text-[16px] font-semibold">{t("emptyTitle")}</h2>
          <p className="text-[14px] leading-relaxed text-slate">
            {noteCount > 0 ? t("emptyBody", { count: noteCount }) : t("emptyNoNotes")}
          </p>
          {noteCount > 0 && <MakeOutline workshopId={workshop.id} />}
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <OutlineEditor
            key={outline.generatedAt}
            workshopId={workshop.id}
            initial={outline.content}
            version={outline.version}
            notes={notes}
          />
          <aside className="flex flex-col gap-5 xl:sticky xl:top-20 xl:self-start">
            <QuestionCards
              workshopId={workshop.id}
              questions={outline.content.questions}
              notes={questionNotes}
            />
            <AskDistil workshopId={workshop.id} canUndo={outline.previous !== null} />
          </aside>
        </div>
      )}
    </div>
  );
}
