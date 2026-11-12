"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Inbox, Plus, StickyNote, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Mark } from "@/components/ui/wordmark";
import { cn } from "@/lib/cn";

/**
 * The frame's left side on a computer, the same on every page: the
 * workshops, newest first, and the account at the bottom, out of the way.
 * The current page is marked by eye and for screen readers.
 */

const item =
  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors hover:bg-surface/70 hover:text-ink";

export function Sidebar({
  workshops,
  user,
  requests,
}: {
  workshops: { id: string; name: string }[];
  user: { name: string; email: string };
  /** For the operator: how many ask for more photos; null for everyone else. */
  requests: number | null;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const openId = pathname.match(/^\/workshops\/([^/]+)/)?.[1];

  return (
    <nav
      aria-label={t("label")}
      className="flex h-full flex-col gap-4 overflow-y-auto border-r border-hairline bg-sidebar px-3 py-4"
    >
      <Link href="/" className="flex items-center gap-2.5 px-2.5 text-ink" aria-label={t("home")}>
        <Mark size={22} />
        <span className="text-[14px] font-semibold tracking-[0.04em]">Distil</span>
      </Link>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2.5 pb-1">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase hover:text-ink"
          >
            {t("workshops")}
          </Link>
          <Link
            href="/#ny"
            className="rounded p-0.5 text-slate hover:bg-surface hover:text-ink"
            aria-label={t("newWorkshop")}
            title={t("newWorkshop")}
          >
            <Plus className="size-4" aria-hidden />
          </Link>
        </div>
        {workshops.map((w) => {
          const open = w.id === openId;
          return (
            <Link
              key={w.id}
              href={`/workshops/${w.id}`}
              aria-current={open ? "page" : undefined}
              className={cn(
                item,
                open
                  ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-hairline)]"
                  : "text-slate",
              )}
            >
              <StickyNote className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{w.name}</span>
            </Link>
          );
        })}
        {workshops.length === 0 && <p className="px-2.5 text-[13px] text-slate">{t("none")}</p>}
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-3">
        {requests !== null && (
          <Link
            href="/admin"
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={cn(
              item,
              pathname.startsWith("/admin") ? "bg-surface text-ink" : "text-slate",
            )}
          >
            <Inbox className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{t("requests")}</span>
            {requests > 0 && (
              <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning tabular">
                {requests}
              </span>
            )}
          </Link>
        )}
        <Link
          href="/account"
          aria-current={pathname.startsWith("/account") ? "page" : undefined}
          className={cn(
            item,
            pathname.startsWith("/account") ? "bg-surface text-ink" : "text-slate",
          )}
        >
          <UserRound className="size-4 shrink-0" aria-hidden />
          <span className="truncate font-medium text-ink">
            {user.name || user.email || t("account")}
          </span>
        </Link>
        <div className="px-1">
          <LogoutButton />
        </div>
        {/* The maker, discreetly: the app may carry it, a presentation never does. */}
        <span className="px-2.5 pt-2 text-[11px] text-slate/80">{t("maker")}</span>
      </div>
    </nav>
  );
}

/** The top of every page on a phone: the mark home and the account. Nothing more is needed there. */
export function PhoneBar() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-hairline bg-paper/95 px-4 backdrop-blur md:hidden print:hidden">
      <Link href="/" className="flex items-center gap-2 text-ink" aria-label={t("home")}>
        <Mark size={20} />
        <span className="text-[14px] font-semibold tracking-[0.04em]">Distil</span>
      </Link>
      <Link
        href="/account"
        className="flex size-10 items-center justify-center rounded-full text-slate hover:text-ink"
        aria-label={t("account")}
      >
        <UserRound className="size-5" aria-hidden />
      </Link>
    </header>
  );
}
