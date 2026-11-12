"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
import { setLookAction } from "@/actions/outlines";
import { LOOKS, type Look } from "@/domain/story";
import { cn } from "@/lib/cn";
import { BRANDED, LOGO_SRC, PALETTES } from "./look";

/** The presentation's colour theme: one button with the theme's name, the eleven behind it. */
export function LookPicker({ workshopId, look }: { workshopId: string; look: Look }) {
  const t = useTranslations("deck.story");
  const router = useRouter();
  const [current, setCurrent] = useState<Look>(look);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const choose = (l: Look) => {
    const before = current;
    setCurrent(l);
    setOpen(false);
    start(async () => {
      const result = await setLookAction({ workshopId, look: l });
      if (result.ok) router.refresh();
      else setCurrent(before);
    });
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("look")}: ${t(`looks.${current}`)}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-md border border-hairline bg-white px-2.5 text-[13px] text-ink hover:border-slate"
      >
        <Swatch look={current} />
        <span className="max-w-[7.5rem] truncate">{t(`looks.${current}`)}</span>
        <ChevronDown className="size-3.5 text-slate" aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("look")}
          className="absolute top-full left-0 z-20 mt-1 grid w-72 grid-cols-1 rounded-lg border border-hairline bg-surface p-1 shadow-[0_8px_24px_rgba(31,45,51,0.12)]"
        >
          {LOOKS.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={current === l}
                onClick={() => choose(l)}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] text-ink hover:bg-sand"
              >
                <Swatch look={l} />
                <span className="flex-1">{t(`looks.${l}`)}</span>
                {current === l && <Check className="size-3.5 text-ink" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Swatch({ look }: { look: Look }) {
  const p = PALETTES[look];
  return (
    <span
      aria-hidden
      className={cn(
        "relative block size-5 shrink-0 overflow-hidden rounded-full border border-hairline",
      )}
      style={{
        background: p.light
          ? `linear-gradient(135deg, ${p.soft} 0 50%, ${p.brand} 50% 75%, ${p.accent} 75% 100%)`
          : `linear-gradient(135deg, ${p.brand} 0 55%, ${p.accent} 55% 100%)`,
      }}
    >
      {look === BRANDED && (
        // eslint-disable-next-line @next/next/no-img-element -- a small local file
        <img src={LOGO_SRC} alt="" className="absolute inset-0 size-full bg-white" />
      )}
    </span>
  );
}
