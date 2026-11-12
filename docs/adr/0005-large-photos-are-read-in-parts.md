# ADR 0005: Large photos are read in parts, and the model must not guess

Status: accepted · Date: 2026-11-12

## Context

The first test on real photos (an iPhone photo of a whole wall, 4032 ×
3024, shrunk to 2000 px as one image) went wrong in a way that matters
more than any other: the model read 13 of 41 notes that a person can read
on the photo, and filled the rest with plausible notes that were not
there ("Kan vi blive bedre til at forstå vores kunder?", ten times over).
A facilitator checking 90 notes would not catch every invented one.

Tried on the same photo with Mistral's API:

| Way of reading                         | Real notes found                | Invented |
| -------------------------------------- | ------------------------------- | -------- |
| Whole, 2000 px, first prompt           | 13 of 41                        | 10+      |
| Whole, 2000 px, "never invent"         | 13                              | 0        |
| Whole, 3000 px, "never invent"         | 13                              | 13       |
| Four overlapping parts, "never invent" | 30 (29 again)                   | 0        |
| mistral-large, whole or parts          | no usable JSON, over 3 minutes  | –        |
| mistral-ocr                            | nothing found on a post-it wall | –        |

In the app, end to end with the parts merged: 34 of 41, none invented,
one note twice, 28 honestly marked unsure.

## The decision

- **The prompt says, above all, never invent**: what cannot be read is
  "?" and marked unsure; fewer correct notes beat many invented ones.
- **A photo with a long side of 2400 px or more is cut by the browser into
  four overlapping parts** (10 % overlap) at up to 2000 px each, sent with
  the whole photo, and kept with it under the same rules (`photo_images`,
  part 0 the whole, 1–4 the parts; deleted together, never audited).
- **The whole photo is read for its drawing; the parts for the words**, all
  at once. Notes read twice in an overlap are merged by place and likeness
  of text, keeping the reading from where the note sat furthest from a
  part's edge (`src/domain/tiles.ts`).
- **The model stays `mistral-medium-latest`**; it was the only one that was
  both good and quick here.
- iPhone photos (HEIC) are decoded in the browser with `heic-to`
  (LGPL-3.0, libheif), loaded only when such a photo comes.

## The trade-off accepted

A large photo costs five readings instead of one: on the dense wall about
16,000 tokens in and 16,000 out, a few tens of øre at today's prices
rather than a few øre, and still one photo against the account's limit.
The upload is larger (about 2–2.5 MB instead of 0.5 MB). In return the
reading is worth checking at all. One wall is not a benchmark: more kinds
of walls and boards should be tried before the numbers are trusted.
