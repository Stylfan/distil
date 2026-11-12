import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuestionCards } from "@/components/outline/question-cards";
import { PhotoIntake } from "@/components/workshop/photo-intake";
import { PhotoList } from "@/components/workshop/photo-list";
import { getDb, withUser } from "@/db/client";
import { formatDay } from "@/lib/dates";
import { getOutline } from "@/services/outlines";
import { resolvePhoneLink } from "@/services/phone-links";
import { getWorkshop } from "@/services/workshops";

export const dynamic = "force-dynamic";

// A link is a key: never in a search engine, never in a preview elsewhere.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

/**
 * What a phone sees after scanning the QR code on the computer: the
 * workshop's camera, Distil's questions, and how far each photo has got.
 * No notes, no desk, no account: the link opens this and nothing more,
 * and only until it expires.
 */
export default async function PhoneLinkPage({ params }: Props) {
  const { token } = await params;
  const t = await getTranslations("phoneLink");
  const access = await resolvePhoneLink(getDb(), token);
  if (!access) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-5">
        <h1 className="text-[17px] font-semibold">{t("expiredTitle")}</h1>
        <p className="text-[14px] leading-relaxed text-slate">{t("expiredBody")}</p>
      </div>
    );
  }
  const { userId, workshopId } = access;
  const loaded = await withUser(userId, async (tx) => {
    const full = await getWorkshop(tx, userId, workshopId);
    const outline = full ? await getOutline(tx, userId, workshopId) : null;
    return full ? { full, outline } : null;
  });
  if (!loaded) {
    return <p className="text-[14px] text-slate">{t("expiredBody")}</p>;
  }
  const { full, outline } = loaded;
  return (
    <>
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] text-slate">{formatDay(full.workshop.heldOn)}</p>
        <h1 className="text-[18px] font-semibold">{full.workshop.name}</h1>
      </div>
      <PhotoIntake workshopId={workshopId} linkToken={token} />
      {outline && (
        <QuestionCards
          workshopId={workshopId}
          questions={outline.content.questions}
          big
          linkToken={token}
        />
      )}
      <PhotoList workshopId={workshopId} photos={full.photos} links={false} />
      <p className="text-[12px] leading-relaxed text-slate">{t("phoneHint")}</p>
    </>
  );
}
