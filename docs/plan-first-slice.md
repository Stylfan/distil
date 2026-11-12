# Plan: the first slices of Distil

The riskiest question is whether Mistral can read real post-its and
whiteboards well enough. So the first slice goes all the way from a photo
to a checked transcript on the computer, on the full secure foundation,
before anything is built on top.

## Slice 1 — photo in, transcript out (approved 12 November 2026, built)

Built as planned, with these notes:

- Tried end to end with made-up readings (`DISTIL_READER=fake`); the
  real reading by Mistral is untested until there is a key. Only the
  vision chat model is wired up; the OCR model is to be compared on real
  photos.
- Reading is a route (`/api/photos/[id]/read`), not a server action, so
  photos can be sent while others are read (ADR 0002).
- An account may also have at most 100 images waiting at once.
- Raising an account's allowance is done in the database until slice 5.

1. **Foundation copied from Prismatic:** Next.js, Tailwind, next-intl,
   Postgres with RLS and the audit log, accounts with password, two-step
   sign-in and passkeys, demo mode, privacy policy and terms in the
   operator's name, export and account deletion, Docker Compose. The
   programme parts of Prismatic are left out.
2. **Workshops:** a list on the computer, "Ny workshop", and the same on
   the phone.
3. **Photos in:** on the phone the camera (several in one go) or the
   gallery; on the computer drag and drop. Shrunk in the browser before
   upload; checked again on the server.
4. **Reading:** each photo goes to Mistral and comes back as notes (text,
   colour, rough position, how sure Distil is). Distil marks the notes it
   is unsure of.
5. **On the computer:** each photo beside its notes; correct a note,
   delete one, approve the photo. Approving deletes the photo; any photo
   not approved is deleted after 24 hours anyway.
6. **Limits:** 10 photos per new account, 50 per workshop, the demo's 10
   per visit and 300 per day, an installation-wide daily ceiling.
7. **Docs:** README, `docs/subprocessors.md` naming Mistral, ADR 0001 on
   the exception to rule 2, `docs/self-hosting.md`.

Done when: you photograph a real wall on your phone, open the workshop on
your computer and see every note read, correct what is wrong, and the
photo is gone afterwards.

## The slices after (each planned before it is built)

2. **Outline (built 12 November 2026):** themes, patterns, Distil's
   recommendations (marked), agreed actions and open points; Distil's
   questions on the phone; the conversation field on the computer. One
   document per workshop ([ADR 0003](adr/0003-the-outline-is-one-document.md)).
   Tried with the fake outliner only; untested against Mistral. Voice
   answers use the phone keyboard's own microphone: the browser's speech
   recognition would send audio to Google or Apple, outside the rules.
3. **Presentation (built 12 November 2026):** overview first, themes
   like the wall, actions, transcript as an optional appendix; PDF
   through print, one 16:9 page per slide (checked with headless Edge: 8
   slides, 8 pages of 13.33 × 7.5 in). Built from the outline by a pure
   function (`src/domain/deck.ts`); only kept recommendations go in; long
   lists are split over slides, never shrunk. The deck's own words follow
   the notes' language (`src/domain/deck-words.ts`).
4. **Drawings (built 12 November 2026):** boxes, arrows, lines and roles
   from whiteboards and flip-overs redrawn as diagrams; flow diagrams, 2×2
   matrices, canvas models and timelines are all shapes and lines placed
   as drawn (`src/domain/diagram.ts`). The same reading of the photo
   returns the notes and the drawing, so no extra call to Mistral. One
   diagram per photo (`diagrams` table, RLS and audit), corrected on the
   desk, a slide of its own unless taken out, cropped to what was drawn.
   Tried with the fake reader only. Dot votes are not counted yet: the
   model reads them as text, if at all.
5. **The bridge and the gate (built 12 November 2026):** QR code from
   computer to phone, a two-hour link into one workshop; "Bed om mere"
   with the operator's approval list in the app. The operator is set with
   a database command ([ADR 0004](adr/0004-a-phone-link-and-an-operator.md)).
6. **After the plan (built 12 November 2026):** dot votes counted per
   note and a votes slide; editing the words on the slides, written back
   to the outline (`src/domain/deck-edit.ts`); PowerPoint download with
   `pptxgenjs` 4.0.1 (MIT, approved by the product owner), its
   `image-size` pinned to a patched version in `pnpm-workspace.yaml`.
7. **Later:** e-mail to the operator, through an existing mailbox rather
   than a paid service.

## Choices to confirm

- **Talking to Mistral:** plain `fetch` to Mistral's API, no SDK. No new
  dependency.
- **Which Mistral model:** both the OCR model and the vision chat model
  are tried on your real photos in slice 1; the better one is chosen and
  the choice recorded. The model name is a setting.
- **Mistral's retention:** Mistral may keep API inputs for a while for
  abuse monitoring. Before the demo opens we check their current terms,
  ask for zero retention if it is offered, and write it in
  `docs/subprocessors.md` and the privacy policy.
- **Where photos wait:** in their own Postgres table with RLS and an
  expiry, not on disk, so deletion and isolation follow the same rules as
  everything else.
- **Shrinking photos:** in the browser with its own tools, no library.
- **PDF:** the browser's print to PDF, no library. A PowerPoint library
  (such as `pptxgenjs`) is a decision for later, asked for then.
- **Dependencies:** the same as Prismatic, including `qrcode` for slice 5.
  Nothing new in slice 1.
- **E-mail for "Bed om mere":** first an approval list inside the app,
  only for the operator. E-mail would need an EU mail service; later.
