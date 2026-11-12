"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, ImagePlus, Upload } from "lucide-react";
import { uploadPhotoAction } from "@/actions/photos";
import { readByLink, uploadByLink } from "./link-requests";
import { requestReading } from "./request-reading";
import { Button } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { preparePhoto } from "./shrink";

/**
 * Photos in: the camera and the gallery on a phone, a drop zone on a
 * computer. Each photo is shrunk here, sent, and then read, at most two
 * readings at a time, so the next photo goes up while the last is read.
 * The list below shows how far each one has got, in words.
 */

type Step = "shrinking" | "sending" | "reading" | "done" | "error";
type Job = { key: number; name: string; step: Step; message?: string; notes?: number };

const PARALLEL_READS = 2;
/** What the pickers offer: every image, and iPhone photos by name, which some systems do not count as images. */
const ACCEPT = "image/*,.heic,.heif,.HEIC,.HEIF";

const isPhoto = (f: File) =>
  f.type.startsWith("image/") || f.type === "" || /\.(heic|heif)$/i.test(f.name);

export function PhotoIntake({
  workshopId,
  linkToken,
  mode = "both",
}: {
  workshopId: string;
  /** Set on a phone let in by a link: the photos go through the link's own routes. */
  linkToken?: string;
  /**
   * "both": the phone's two buttons and the computer's drop zone, by screen size.
   * "phone": only the phone's buttons. "toolbar": one button for a computer's
   * toolbar, with photos dropped anywhere on the page.
   */
  mode?: "both" | "phone" | "toolbar";
}) {
  const t = useTranslations("intake");
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const counter = useRef(0);

  const update = (key: number, change: Partial<Job>) =>
    setJobs((all) => all.map((j) => (j.key === key ? { ...j, ...change } : j)));

  async function take(files: FileList | File[]) {
    const list = Array.from(files).filter(isPhoto);
    if (list.length === 0) return;
    const fresh = list.map((f) => ({
      key: ++counter.current,
      name: f.name,
      step: "shrinking" as Step,
    }));
    setJobs((all) => [...fresh, ...all]);

    const reading = new Set<Promise<void>>();
    for (const [i, file] of list.entries()) {
      const { key } = fresh[i]!;
      let photoId: string;
      try {
        const prepared = await preparePhoto(file);
        update(key, { step: "sending" });
        const form = new FormData();
        form.set("workshopId", workshopId);
        form.set("photo", prepared.whole, "photo.jpg");
        form.set("parts", JSON.stringify(prepared.parts.map((p) => p.rect)));
        prepared.parts.forEach((p, n) => form.set(`part${n + 1}`, p.blob, `part${n + 1}.jpg`));
        const sent = linkToken
          ? await uploadByLink(linkToken, form)
          : await uploadPhotoAction(form);
        if (!sent.ok) {
          update(key, { step: "error", message: t(`errors.${sent.error}`) });
          // A full workshop or used-up photos stop the rest too.
          if (sent.error === "workshopFull" || sent.error === "stored") break;
          continue;
        }
        photoId = sent.photoId;
      } catch {
        update(key, { step: "error", message: t("errors.type") });
        continue;
      }
      update(key, { step: "reading" });
      router.refresh();
      const answer = linkToken ? readByLink(linkToken, photoId) : requestReading(photoId);
      const job: Promise<void> = answer.then((read) => {
        update(
          key,
          read.ok
            ? { step: "done", notes: read.notes }
            : { step: "error", message: t(`errors.${read.error}`) },
        );
        router.refresh();
      });
      const tracked = job.finally(() => reading.delete(tracked));
      reading.add(tracked);
      if (reading.size >= PARALLEL_READS) await Promise.race(reading);
    }
    await Promise.all(reading);
  }

  const pick = (input: HTMLInputElement | null) => {
    if (input?.files) void take(input.files);
    if (input) input.value = "";
  };

  // In the toolbar, photos can be dropped anywhere on the page.
  useEffect(() => {
    if (mode !== "toolbar") return;
    const files = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes("Files");
    const over = (e: DragEvent) => {
      if (!files(e)) return;
      e.preventDefault();
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget === null) setOver(false);
    };
    const drop = (e: DragEvent) => {
      if (!files(e)) return;
      e.preventDefault();
      setOver(false);
      void take(e.dataTransfer!.files);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  });

  if (mode === "toolbar") {
    const working = jobs.filter((j) => j.step !== "done" && j.step !== "error").length;
    const failed = jobs.filter((j) => j.step === "error");
    const done = jobs.filter((j) => j.step === "done").length;
    return (
      <>
        <Button onClick={() => gallery.current?.click()}>
          <Upload className="size-4" aria-hidden />
          {t("add")}
        </Button>
        <input
          ref={gallery}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => pick(e.currentTarget)}
        />
        {jobs.length > 0 && (
          <span
            role="status"
            className="text-[12px] text-slate"
            title={failed.map((j) => j.message).join("\n")}
          >
            {working > 0 ? t("working", { count: working }) : t("finished", { count: done })}
            {failed.length > 0 && (
              <span className="text-danger"> · {t("failed", { count: failed.length })}</span>
            )}
          </span>
        )}
        {over && (
          <div className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-xl border-2 border-dashed border-ink bg-paper/85 text-[15px] font-medium text-ink">
            {t("dropHere")}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* On a phone: two big buttons, the camera first. */}
      <div className={cn("grid grid-cols-2 gap-2", mode === "both" && "md:hidden")}>
        <Button
          variant="primary"
          className="h-14 text-[15px]"
          onClick={() => camera.current?.click()}
        >
          <Camera className="size-5" aria-hidden />
          {t("camera")}
        </Button>
        <Button className="h-14 text-[15px]" onClick={() => gallery.current?.click()}>
          <ImagePlus className="size-5" aria-hidden />
          {t("gallery")}
        </Button>
      </div>
      {/* On a computer: drop the photos here, or choose them. */}
      {mode === "both" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void take(e.dataTransfer.files);
          }}
          className={cn(
            "hidden items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-[13px] text-slate md:flex",
            over ? "border-ink bg-sand/60" : "border-hairline bg-surface",
          )}
        >
          <Upload className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{t("drop")}</span>
          <Button size="sm" onClick={() => gallery.current?.click()}>
            {t("choose")}
          </Button>
        </div>
      )}
      <input
        ref={camera}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => pick(e.currentTarget)}
      />
      <input
        ref={gallery}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => pick(e.currentTarget)}
      />
      {jobs.length > 0 && (
        <ul aria-live="polite" className="flex flex-col gap-1 text-[13px]">
          {jobs.slice(0, 12).map((j) => (
            <li key={j.key} className="flex items-baseline gap-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  j.step === "done" && "bg-success",
                  j.step === "error" && "bg-danger",
                  j.step !== "done" && j.step !== "error" && "animate-pulse bg-warning",
                )}
                aria-hidden
              />
              <span className={cn(j.step === "error" ? "text-danger" : "text-slate")}>
                {j.step === "done"
                  ? t("done", { count: j.notes ?? 0 })
                  : j.step === "error"
                    ? j.message
                    : t(j.step)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
