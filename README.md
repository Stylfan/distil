# Distil

Distil turns the physical output of a workshop into something digital.
The facilitator photographs post-it walls, whiteboards and flip-overs with
a phone; Distil reads every word, and on the computer each photo stands
beside what was read, so it can be checked and corrected before anything
is built on it. The photos are deleted as soon as they are checked, and
never kept more than a day.

The interface is in Danish.

## Status

Early: five slices. What works today:

- Accounts with e-mail and password, two-step sign-in (authenticator app
  and recovery codes) and passkeys, as in Prismatic. Each account sees only
  its own workshops, and the database itself enforces it.
- Workshops with a name and a day.
- On a phone: the camera (or the gallery), photos shrunk in the browser
  and sent one after another, read two at a time, with the status of each.
  JPEG, PNG, WebP and iPhone photos (HEIC, decoded in the browser). A
  large photo is also cut into four overlapping parts at full resolution,
  so small handwriting is read rather than guessed
  ([ADR 0005](docs/adr/0005-large-photos-are-read-in-parts.md)).
- On a computer: drag photos in; each photo beside its notes, with a
  numbered marker where each note was read, the notes Distil is unsure of
  in amber with the other readings it considered; correct the text and
  colour, add a missed note, delete one; approve the photo, which deletes
  the image.
- The outline (Disposition): from all the read notes, Distil makes a
  summary, themes with their points and the notes they came from,
  patterns, recommendations (its proposals, until kept), what was agreed
  and what is open. Edit everything in place, saved as you type; ask
  Distil for a change in plain words, make it again, or undo its last
  change.
- Distil's questions (whether the colours meant something, an unclear
  word, whether something was agreed), answered by a tap on the phone or
  on the computer, and used the next time.
- The presentation (Præsentation): built from the outline and nothing
  else, neutral and without a brand, in the language the notes are written
  in (Danish or English). A title, the workshop on one page, a slide per
  theme with its notes laid out as post-its in their colours, the
  patterns, the recommendations the facilitator kept, what was agreed
  (what, who, when) and what is open; every note word for word as an
  appendix when asked for. Saved as PDF with the browser's own print, one
  16:9 page per slide, or downloaded as a PowerPoint file with real text
  boxes, tables and shapes to keep working in (pptxgenjs, MIT). The words
  can be changed on the slides themselves; a change goes back to the
  outline.
- Dot votes: the dots, stickers or ticks on each note are counted when the
  photo is read, can be corrected on the desk, weigh in Distil's outline,
  show on the post-its in the deck, and give a slide of what the room
  voted for most.
- Drawings: a whiteboard or flip-over drawing (boxes, roles as stick
  figures, circles, notes stuck in it, lines and arrows with their words)
  is redrawn as a clean diagram when the photo is read, keeping the layout
  it had on the board. It stands beside the photo to be corrected, and
  gets a slide of its own in the presentation unless taken out.
- Phone home screen: an icon and a web app manifest, so Distil opens full
  screen like an app.
- From computer to phone: "Tilføj fra telefon" shows a QR code; scanned,
  it opens the workshop's camera and Distil's questions on the phone
  without signing in there, for two hours, and nothing else
  ([ADR 0004](docs/adr/0004-a-phone-link-and-an-operator.md)).
- "Bed om flere billeder": an account running low asks, the operator
  answers yes or no under **Anmodninger**.
- Limits: 10 photos per account, 300 per day for the installation, 50 per
  workshop, checks on every photo; 30 outlines per account and 500 per
  installation a day.
- Under **Konto**: download everything as JSON, delete the account with
  everything in it. A demo mode where a visit is gone after a day.

Next: trying it on real walls with Mistral, then what that shows. Later:
PowerPoint, e-mail. See
[docs/plan-first-slice.md](docs/plan-first-slice.md).

## Run it on your own machine

You need Node 22 or later, pnpm and Docker.

```bash
pnpm install
cp .env.example .env    # then set DISTIL_SECRET, and MISTRAL_API_KEY or DISTIL_READER=fake
pnpm db:up && pnpm db:migrate
pnpm dev
```

Without a Mistral key, set `DISTIL_READER=fake` in `.env`: every photo
then "reads" as the same made-up wall, which is enough to try the app.

`pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm format` keep it
honest. The tests use their own database in the same Postgres and never
call Mistral.

## Run it on a server

One server, Docker Compose, Postgres, a Mistral key; with Coolify: [docs/deploy-coolify.md](docs/deploy-coolify.md). In general:
[docs/self-hosting.md](docs/self-hosting.md).

## The rules it lives by

Distil follows the seven rules the [Haij](https://haij.dk) tools are built
by, with one exception, made on purpose.

| Rule                              | How Distil meets it                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Real open source                | AGPL-3.0. What runs anywhere is this repository, nothing more.                                                                                                                                                                        |
| 2 Self-hosting                    | Docker Compose with one Postgres on one server. **The exception:** photos are read by Mistral's API, so reading needs the internet ([ADR 0001](docs/adr/0001-mistral-reads-the-photos.md)).                                           |
| 3 Your data, always               | One-click export as JSON, and complete deletion of the account and everything it owns.                                                                                                                                                |
| 4 EU or self-hosted               | Mistral (France, EU) and the hosting you choose, nobody else: [who can see what](docs/subprocessors.md).                                                                                                                              |
| 5 The AI helps, the human decides | Every reading is shown beside its photo to be checked; Distil marks what it is unsure of and never guesses silently.                                                                                                                  |
| 6 Secure from day one             | Row-level security with tests proving it, an audit log no role can edit, passkeys and two-step sign-in, photos deleted within a day and never audited ([ADR 0002](docs/adr/0002-photos-are-kept-a-day-at-most.md)), limits on AI use. |
| 7 Used for real                   | Built from its maker's own workshops.                                                                                                                                                                                                 |

## Licence and credits

AGPL-3.0. The foundation (accounts, two-step sign-in, passkeys, row-level
security, the audit log, the demo mode and the legal pages) is copied from
[Prismatic](https://github.com/Stylfan/prismatic), which in turn began in
[Ajour](https://github.com/MartinNymannVinther/ajour) by Martin Nymann
Vinther (AGPL-3.0). Made by Lenskjold Consulting, built together with
Claude Code.
