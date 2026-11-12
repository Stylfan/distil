"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mic, Square } from "lucide-react";
import { MAX_DICTATION_SECONDS } from "@/domain/limits";
import { cn } from "@/lib/cn";

/**
 * A small microphone in a field: press it and talk, press again (or wait
 * two minutes) and the words are written into the field. The browser asks
 * for the microphone the first time. The recording goes to Distil, which
 * has Mistral turn it into text and keeps none of it.
 */

type State = "idle" | "recording" | "working";

export function MicButton({
  onText,
  language = "da",
  className,
}: {
  /** The words, to be added to what the field holds. */
  onText: (text: string) => void;
  language?: "da" | "en";
  className?: string;
}) {
  const t = useTranslations("dictate");
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const send = async (audio: Blob) => {
    setState("working");
    try {
      const response = await fetch(`/api/dictate?language=${language}`, {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audio,
      });
      const result = (await response.json()) as
        { ok: true; text: string } | { ok: false; error: string };
      if (result.ok) {
        if (result.text) onText(result.text);
        else setError(t("nothing"));
      } else
        setError(
          t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t("errors.generic"),
        );
    } catch {
      setError(t("errors.provider"));
    }
    setState("idle");
  };

  const start = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("errors.denied"));
      return;
    }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (timer.current) clearInterval(timer.current);
      void send(new Blob(chunks, { type: rec.mimeType || type || "audio/webm" }));
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_DICTATION_SECONDS && rec.state === "recording") rec.stop();
        return s + 1;
      });
    }, 1000);
  };

  const stop = () => recorder.current?.state === "recording" && recorder.current.stop();

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {state === "recording" && (
        <span className="text-[11px] text-danger tabular" aria-live="polite">
          {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
        </span>
      )}
      <button
        type="button"
        onClick={() =>
          state === "recording" ? stop() : state === "idle" ? void start() : undefined
        }
        disabled={state === "working"}
        aria-label={state === "recording" ? t("stop") : t("start")}
        aria-pressed={state === "recording"}
        title={error ?? (state === "recording" ? t("stop") : t("start"))}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full transition",
          state === "recording"
            ? "bg-danger text-white"
            : error
              ? "text-danger hover:bg-danger-soft"
              : "text-slate hover:bg-sand hover:text-ink",
        )}
      >
        {state === "working" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : state === "recording" ? (
          <Square className="size-3 fill-current" aria-hidden />
        ) : (
          <Mic className="size-3.5" aria-hidden />
        )}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </span>
  );
}

/** Adds dictated words to what a field holds, with a space between. */
export const addWords = (current: string, words: string) =>
  current.trim() ? `${current.replace(/\s+$/, "")} ${words}` : words;
