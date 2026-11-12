/** Not there, or not the acting user's: the two look the same from outside. */
export class NotFound extends Error {
  constructor() {
    super("notFound");
  }
}

/**
 * A limit stopped the work: the account's photos are used up, the
 * installation's ceiling for today is reached, the workshop is full, or
 * the account already has as many images waiting as it may.
 */
export type LimitKind = "allowance" | "daily" | "workshopFull" | "stored" | "outlines";

export class LimitReached extends Error {
  constructor(readonly kind: LimitKind) {
    super(kind);
  }
}

/** The photo is not one the server will keep (src/domain/image.ts). */
export class BadPhoto extends Error {
  constructor(readonly reason: "type" | "size" | "dimensions") {
    super(reason);
  }
}

/** Someone saved the same thing in the meantime (another window, the phone). */
export class Conflict extends Error {
  constructor() {
    super("conflict");
  }
}
