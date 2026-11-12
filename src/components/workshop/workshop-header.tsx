import { getTranslations } from "next-intl/server";
import type { Workshop } from "@/db/schema";
import { PageHeader } from "@/components/ui/layout";
import { formatDay } from "@/lib/dates";
import { WorkshopMenu } from "./workshop-menu";

/**
 * The same header on all three tabs of a workshop: its day, its name, a
 * quiet note when it is archived, and its "⋯" (rename, archive, delete).
 */
export async function WorkshopHeader({ workshop }: { workshop: Workshop }) {
  const t = await getTranslations("workshops");
  return (
    <PageHeader
      label={formatDay(workshop.heldOn)}
      title={workshop.name}
      actions={
        <div className="flex items-center gap-3">
          {workshop.archivedAt !== null && (
            <span className="text-[12px] text-slate">{t("archivedNote")}</span>
          )}
          <WorkshopMenu
            id={workshop.id}
            name={workshop.name}
            heldOn={workshop.heldOn}
            archived={workshop.archivedAt !== null}
          />
        </div>
      }
    />
  );
}
