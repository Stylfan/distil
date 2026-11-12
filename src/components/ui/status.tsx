"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type Status = { kind: "ok" | "error"; text: string } | null;

/** A short message after an action, announced to screen readers and cleared after a few seconds. */
export function useStatus(): [Status, (s: Status) => void] {
  const [status, setStatus] = useState<Status>(null);
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);
  return [status, useCallback((s: Status) => setStatus(s), [])];
}

export function StatusMessage({ status, className }: { status: Status; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "min-h-5 text-[13px] font-medium",
        status?.kind === "error" ? "text-danger" : "text-success",
        className,
      )}
    >
      {status?.text ?? ""}
    </p>
  );
}
