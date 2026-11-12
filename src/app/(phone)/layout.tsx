import { Mark } from "@/components/ui/wordmark";

/**
 * The frame of a phone let in by a link: the mark and the page, nothing to
 * navigate to, because the link opens one workshop and nothing else.
 */
export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-hairline bg-paper/95 px-4 text-ink backdrop-blur">
        <Mark size={20} />
        <span className="text-[14px] font-semibold tracking-[0.04em]">Distil</span>
      </header>
      <main id="content" className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-5">
        {children}
      </main>
    </div>
  );
}
