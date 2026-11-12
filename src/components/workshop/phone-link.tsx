"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Smartphone } from "lucide-react";
import { closePhoneLinksAction, createPhoneLinkAction } from "@/actions/phone-links";
import { Button } from "@/components/ui/controls";

/**
 * "Tilføj fra telefon" on the computer: a QR code to scan with the phone's
 * camera, which opens this workshop's camera on the phone without signing
 * in there. The link works for two hours and can be closed at once.
 */
export function PhoneLink({ workshopId }: { workshopId: string }) {
  const t = useTranslations("phoneLink");
  const dialog = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState<{ url: string; qr: string; expiresAt: number } | null>(null);
  const [error, setError] = useState(false);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      setError(false);
      setClosed(false);
      setCopied(false);
      const result = await createPhoneLinkAction(workshopId);
      if (result.ok) {
        setLink(result.data);
        dialog.current?.showModal();
      } else setError(true);
    });

  const until = link
    ? new Date(link.expiresAt).toLocaleTimeString("da-DK", {
        timeZone: "Europe/Copenhagen",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <>
      <Button size="sm" variant="ghost" onClick={open} disabled={pending}>
        <Smartphone className="size-3.5" aria-hidden />
        {t("open")}
      </Button>
      {error && <span className="text-[12px] text-danger">{t("failed")}</span>}
      <dialog
        ref={dialog}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-hairline bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate">{t("body")}</p>
        {link && !closed && (
          <>
            {/* The SVG is drawn on the server by the qrcode package from our own address. */}
            <div
              className="mx-auto my-4 w-56 [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: link.qr }}
            />
            <p className="text-center text-[12px] text-slate">{t("until", { time: until })}</p>
            <div className="mt-2 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                data-link={link.url}
                onClick={() => {
                  void navigator.clipboard?.writeText(link.url).then(() => setCopied(true));
                }}
              >
                {copied ? t("copied") : t("copy")}
              </Button>
            </div>
          </>
        )}
        {closed && <p className="my-4 text-[13px] text-success">{t("closedNow")}</p>}
        <div className="mt-5 flex justify-end gap-2">
          {!closed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                start(async () => {
                  const result = await closePhoneLinksAction(workshopId);
                  if (result.ok) setClosed(true);
                })
              }
            >
              {t("close")}
            </Button>
          )}
          <Button size="sm" onClick={() => dialog.current?.close()} autoFocus>
            {t("done")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
