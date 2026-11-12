# Distil

Distil turns the physical output of a workshop into something digital.
The facilitator photographs post-it walls, whiteboards and flip-overs with
a phone; Distil reads every word, and on the computer each photo stands
beside what was read, so it can be checked and corrected before anything
is built on it. The photos are deleted as soon as they are checked, and
never kept more than a day.

The interface is in Danish.

## Status

Early: two slices. What works today:

- Accounts with e-mail and password, two-step sign-in (authenticator app
  and recovery codes) and passkeys, as in Prismatic. Each account sees only
  its own workshops, and the database itself enforces it.
- Workshops with a name and a day.
- On a phone: the camera (or the gallery), photos shrunk in the browser
  and sent one after another, read two at a time, with the status of each.
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
- Limits: 10 photos per account, 300 per day for the installation, 50 per
  workshop, checks on every photo; 30 outlines per account and 500 per
  installation a day.
- Under **Konto**: download everything as JSON, delete the account with
  everything in it. A demo mode where a visit is gone after a day.

Next: the presentation and PDF, built from the outline; then whiteboard
drawings redrawn as diagrams. See
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

One server, Docker Compose, Postgres, a Mistral key:
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
