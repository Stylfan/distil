import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { WorkshopFull } from "@/services/workshops";
import { cn } from "@/lib/cn";

type Photo = WorkshopFull["photos"][number];

/** A dot and a word for where a photo has got to. */
function statusTone(p: Photo): string {
  if (p.status === "approved") return "bg-success";
  if (p.status === "failed") return "bg-danger";
  if (p.status === "read") return p.unsureCount > 0 ? "bg-warning" : "bg-technical";
  return "animate-pulse bg-hairline";
}

/**
 * The workshop's photos as a list: number, where each has got to, and how
 * many notes (and how many Distil is unsure of). On a computer each one
 * opens on the desk; on a phone it is the status, nothing more.
 */
export async function PhotoList({
  workshopId,
  photos,
  selected,
  links,
}: {
  workshopId: string;
  photos: Photo[];
  selected?: string;
  links: boolean;
}) {
  const t = await getTranslations("photos");
  return (
    <ol className="flex flex-col gap-0.5">
      {photos.map((p) => {
        const body = (
          <>
            <span className={cn("size-2 shrink-0 rounded-full", statusTone(p))} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="font-medium text-ink">{t("photo", { number: p.seq })}</span>
              <span className="truncate text-[12px] text-slate">
                {t(`status.${p.status}`)}
                {(p.status === "read" || p.status === "approved") &&
                  ` · ${t("notes", { count: p.noteCount })}`}
                {p.status === "read" &&
                  p.unsureCount > 0 &&
                  ` · ${t("unsure", { count: p.unsureCount })}`}
              </span>
            </span>
          </>
        );
        const row = "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]";
        return (
          <li key={p.id}>
            {links ? (
              <Link
                href={`/workshops/${workshopId}?photo=${p.id}`}
                aria-current={selected === p.id ? "page" : undefined}
                className={cn(
                  row,
                  "hover:bg-sand/60",
                  selected === p.id && "bg-surface shadow-[0_0_0_1px_var(--color-hairline)]",
                )}
              >
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
