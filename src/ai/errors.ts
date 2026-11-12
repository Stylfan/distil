/** Why a reading did not happen, as a short code the page turns into words. Never model output. */
export type ReadFailure = "notConfigured" | "provider" | "unreadable";

export class ReadError extends Error {
  constructor(readonly code: ReadFailure) {
    super(code);
  }
}
