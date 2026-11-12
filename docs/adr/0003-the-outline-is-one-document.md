# ADR 0003: The outline is one document

Status: accepted · Date: 2026-11-12

## Context

After the notes are checked, Distil turns them into an outline: a
summary, themes with their points and notes, patterns, recommendations,
what was agreed and what is open, and questions for the facilitator. The
facilitator then edits it on the computer, answers the questions on the
phone or the computer, and may ask Distil to change it ("slå tema 2 og 3
sammen"). The outline will become the presentation in the next slice.

## The decision

- **One row per workshop (`outlines`), the outline as JSON**, checked
  against one schema (`src/domain/outline.ts`) on every save, whether the
  facilitator or the model wrote it. Forced row-level security and the
  audit trigger as on every workshop table.
- **The model's answer is untrusted input**: notes go out as numbered
  lines (`n12`), never ids; references come back, are mapped to real
  notes, and unknown ones are dropped (`src/domain/outline-reading.ts`).
- **What is Distil's is marked**: patterns are its reading, and a
  recommendation stays its proposal until the facilitator keeps it.
- **Edits carry a version**; a save based on an old version is refused,
  so the phone and the computer cannot overwrite each other unseen.
  **Answers are saved apart** and do not move the version, so answering
  on the phone never conflicts with editing on the computer.
- **Distil's last change can be undone**: the outline before it is kept
  in `previous`. Answers survive a new outline, also when the model does
  not ask the same question again.
- **The colour question is a rule, not the model's**: when the notes come
  in two or more colours, Distil asks whether the colours meant something.
- **Making or changing an outline is a route** (`/api/workshops/[id]/outline`),
  counted against 30 per account and 500 per installation per day.

## The trade-off accepted

Saving the whole document on every edit is more data per save than
saving one field, and two edits in two windows within the same second
make one of them reload. In return there is one schema to check, one
place for the rules, and the presentation can be built straight from the
same document. Free-text answers and requests go to Mistral as written,
so a facilitator who writes a name there sends it.
