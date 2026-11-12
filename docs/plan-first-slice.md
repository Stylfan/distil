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

2. **Outline:** themes, patterns, Distil's recommendations (marked),
   agreed actions and open points; Distil's questions on the phone; the
   conversation field on the computer.
3. **Presentation:** overview first, themes like the wall, actions,
   transcript as an optional appendix; PDF through print.
4. **Drawings:** boxes, arrows, lines and roles from whiteboards and
   flip-overs redrawn as diagrams; flow diagrams, 2×2 matrices, canvas
   models, timelines, dot votes.
5. **The bridge and the gate:** QR code from computer to phone;
   "Bed om mere" with the operator's approval list in the app.
6. **Later:** PowerPoint, e-mail.

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
