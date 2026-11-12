import { z } from "zod";

/**
 * What the facilitator tells Distil about a workshop, so the photos do not
 * stand alone and the model does not have to guess: why it was held, who
 * was there, who the presentation is for and what it must do for them,
 * the agenda, and anything else worth knowing. The facilitator's own
 * words, so they guide the outline and the story as instructions do.
 */

const field = (max: number) => z.string().trim().max(max);

export const contextSchema = z.object({
  purpose: field(1500),
  participants: field(800),
  /** Who will see the presentation: the board, the participants, the members … */
  audience: field(300),
  /** What the presentation must do for them: decide, document, win support … */
  need: field(800),
  /** The workshop's own agenda, typed in or taken from a file or a photo. */
  agenda: field(6000),
  other: field(1500),
});

export type WorkshopContext = z.infer<typeof contextSchema>;

export const EMPTY_CONTEXT: WorkshopContext = {
  purpose: "",
  participants: "",
  audience: "",
  need: "",
  agenda: "",
  other: "",
};

/** The audiences a facilitator can pick with one tap; any other can be written. */
export const AUDIENCES = [
  "board",
  "participants",
  "steering",
  "members",
  "client",
  "team",
] as const;

export function hasContext(context: WorkshopContext | null | undefined): boolean {
  return !!context && Object.values(context).some((v) => v.trim());
}

/** The context as the model reads it, or "" when there is none. */
export function contextForModel(context: WorkshopContext | null | undefined): string {
  if (!hasContext(context)) return "";
  const c = context!;
  const lines = [
    c.purpose && `Why the workshop was held: ${c.purpose}`,
    c.participants && `Who took part: ${c.participants}`,
    c.audience && `Who the presentation is for: ${c.audience}`,
    c.need && `What the presentation must do for them: ${c.need}`,
    c.other && `Also worth knowing: ${c.other}`,
    c.agenda && `The workshop's agenda:\n${c.agenda}`,
  ].filter(Boolean);
  return `The facilitator's context for this workshop (their own words; follow it):\n${lines.join("\n")}`;
}
