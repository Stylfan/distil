import type { UploadResult } from "@/actions/photos";
import type { ReadOutcome } from "@/lib/read-photo";

/**
 * The phone's requests when it was let in by a link rather than signed in:
 * the same work as the server actions, through the link's own routes.
 * "expired" when the link's time is up.
 */

type Expired = { ok: false; error: "expired" };

async function post<T>(url: string, body: BodyInit, json = false): Promise<T | Expired> {
  try {
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: json ? { "Content-Type": "application/json" } : undefined,
    });
    return (await response.json()) as T | Expired;
  } catch {
    return { ok: false, error: "provider" } as T;
  }
}

const base = (token: string) => `/api/link/${encodeURIComponent(token)}`;

export function uploadByLink(token: string, form: FormData) {
  return post<UploadResult>(`${base(token)}/photos`, form);
}

export function readByLink(token: string, photoId: string) {
  return post<ReadOutcome>(`${base(token)}/photos/${encodeURIComponent(photoId)}/read`, "");
}

export function answerByLink(token: string, questionId: string, answer: string) {
  return post<{ ok: boolean; error?: string }>(
    `${base(token)}/answer`,
    JSON.stringify({ questionId, answer }),
    true,
  );
}
