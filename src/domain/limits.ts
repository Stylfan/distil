/**
 * How much a photo may be and how many may be read, so a public
 * installation cannot run up the bill at Mistral or fill the database.
 * The numbers an operator may want to change are read from the
 * environment, with these defaults (CLAUDE.md, "Limits").
 */

/** A workshop holds at most this many photos. */
export const PHOTOS_PER_WORKSHOP = 50;
/** An account may have at most this many images waiting to be checked, across its workshops. */
export const MAX_IMAGES_WAITING = 100;
/** The largest photo the server takes. The browser shrinks photos well below it. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
/** The longest side the browser shrinks a photo to, and the most the server takes. */
export const MAX_PHOTO_EDGE = 2400;
/** The smallest side worth reading. */
export const MIN_PHOTO_EDGE = 200;
/** A photo's image is deleted when it is approved, and never kept longer than this. */
export const IMAGE_HOURS = 24;
/** The longest a spoken answer may be, in seconds; the browser stops recording there. */
export const MAX_DICTATION_SECONDS = 120;
/** The largest recording the server takes (two minutes of speech is well under it). */
export const MAX_DICTATION_BYTES = 3 * 1024 * 1024;

export type Limits = {
  /** Photos a new account (or a demo visit) may have read in all. */
  allowance: number;
  /** What an account may have read in all once the operator has said yes to more. */
  approvedAllowance: number;
  /** Photos the whole installation may have read per day. */
  dailyCeiling: number;
  /** Outlines Distil may make or change for one account per day. */
  outlinesPerAccount: number;
  /** Outlines Distil may make or change for the whole installation per day. */
  outlineCeiling: number;
  /** Times one account may have speech turned into text per day. */
  dictationsPerAccount: number;
  /** Times the whole installation may have speech turned into text per day. */
  dictationCeiling: number;
};

function positive(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function limits(env: NodeJS.ProcessEnv = process.env): Limits {
  return {
    allowance: positive(env.DISTIL_PHOTO_ALLOWANCE, 10),
    approvedAllowance: positive(env.DISTIL_APPROVED_ALLOWANCE, 100),
    dailyCeiling: positive(env.DISTIL_DAILY_PHOTO_LIMIT, 300),
    outlinesPerAccount: positive(env.DISTIL_DAILY_OUTLINES_PER_ACCOUNT, 30),
    outlineCeiling: positive(env.DISTIL_DAILY_OUTLINE_LIMIT, 500),
    dictationsPerAccount: positive(env.DISTIL_DAILY_DICTATIONS_PER_ACCOUNT, 100),
    dictationCeiling: positive(env.DISTIL_DAILY_DICTATION_LIMIT, 1000),
  };
}

/** The day an instant falls on in UTC, yyyy-mm-dd: the key of the daily ceiling. */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
