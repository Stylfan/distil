import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Monitor } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { DiagramPanel } from "@/components/diagram/diagram-panel";
import { MakeOutline } from "@/components/outline/outline-run";
import { QuestionCards, type QuestionNote } from "@/components/outline/question-cards";
import { ContextPanel } from "@/components/workshop/context-panel";
import { PhotoIntake } from "@/components/workshop/photo-intake";
import { WorkshopTabs } from "@/components/workshop/workshop-tabs";
import { PhotoList } from "@/components/workshop/photo-list";
import { ReviewPanel } from "@/components/workshop/review-panel";
import { MaterialToolbar } from "@/components/workshop/material-toolbar";
import { WorkshopHeader } from "@/components/workshop/workshop-header";
import { withUser } from "@/db/client";
import { loadDesk } from "@/lib/workshop-desk";
import { getWorkshop } from "@/services/workshops";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ photo?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const full = await withUser(user.id, (tx) => getWorkshop(tx, user.id, id));
  return { title: full?.workshop.name };
}

/**
 * One workshop. On a phone: the camera, and how far each photo has got.
 * On a computer: the photos down the side and the desk for the chosen one,
 * the photo beside what Distil read off it.
 */
export default async function WorkshopPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { photo: wanted } = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("workshop");
  const loaded = await loadDesk(user.id, id, wanted);
  if (!loaded) notFound();
  const { full, chosen, notes, outline, diagram, questionNotes } = loaded;
  const { workshop, photos } = full;
  const readCount = photos.filter((p) => p.status === "read" || p.status === "approved").length;
  const toCheck = photos.filter((p) => p.status === "read").length;

  return (
    <div className="flex flex-col gap-5">
      <WorkshopHeader workshop={workshop} />

      <WorkshopTabs workshopId={workshop.id} current="transcript" />

      {/* The computer: one calm line for the material. */}
      <MaterialToolbar
        workshopId={workshop.id}
        context={workshop.context}
        status={t("summary", { photos: photos.length, toCheck })}
        next={outline ? "open" : readCount > 0 ? "make" : null}
      />

      {/* The phone: what the workshop was about, and the camera. */}
      <div className="flex flex-col gap-3 md:hidden">
        <ContextPanel workshopId={workshop.id} context={workshop.context} />
        <PhotoIntake workshopId={workshop.id} mode="phone" />
      </div>

      {/* The phone: Distil's questions, the status, and where the checking happens. */}
      <div className="flex flex-col gap-4 md:hidden">
        {outline && (
          <QuestionCards
            workshopId={workshop.id}
            questions={outline.content.questions}
            notes={questionNotes as QuestionNote[]}
            big
          />
        )}
        {!outline && readCount > 0 && <MakeOutline workshopId={workshop.id} big />}
        {photos.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-technical-soft px-3 py-2.5 text-[13px] leading-relaxed text-ink">
            <Monitor className="mt-0.5 size-4 shrink-0 text-technical" aria-hidden />
            {t("checkOnComputer")}
          </p>
        )}
        <PhotoList workshopId={workshop.id} photos={photos} links={false} />
      </div>

      {/* The computer: the desk. */}
      <div className="hidden gap-6 md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2">
          <PhotoList workshopId={workshop.id} photos={photos} selected={chosen?.id} links />
        </aside>
        {chosen ? (
          <div className="flex min-w-0 flex-col gap-6">
            <ReviewPanel
              workshopId={workshop.id}
              photo={{
                id: chosen.id,
                seq: chosen.seq,
                width: chosen.width,
                height: chosen.height,
                status: chosen.status,
                error: chosen.error,
                hasImage: chosen.imageExpiresAt !== null,
                imageExpiresIn: chosen.imageExpiresIn,
              }}
              notes={notes}
            />
            {diagram && (
              <DiagramPanel
                key={diagram.updatedAt}
                photoId={chosen.id}
                initial={diagram.content}
                include={diagram.include}
                width={chosen.width}
                height={chosen.height}
              />
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-hairline p-8 text-[14px] leading-relaxed text-slate">
            {t("empty")}
          </div>
        )}
      </div>
    </div>
  );
}
