# CLAUDE.md — Distil

Distil turns the physical output of a workshop into a digital
presentation. A facilitator photographs post-it walls, whiteboards,
flip-overs, flow diagrams and canvas models; Distil reads every word,
redraws the drawings, groups what was said into themes, patterns,
recommendations, agreed actions and open points, and lays it out as a
presentation the facilitator can download as PDF and keep working with.
Read this file at the start of every session.

## Principles

- **From the wall to the next meeting in minutes, not hours.** If making
  the presentation by hand is faster, Distil has failed.
- **The phone is the camera, the computer is the desk.** The phone takes
  the photos and answers Distil's questions, nothing more. Seeing the
  photos, correcting the reading, shaping the outline and the
  presentation happen on the computer. Never squeeze the desk onto the
  phone.
- **Nothing is lost.** The first thing Distil makes is a verbatim
  transcript of every note. The facilitator chooses whether it goes in
  as the last appendix.
- **Distil proposes, the facilitator decides.** Distil may interpret
  freely (patterns, recommendations), but its own suggestions are marked
  as such, and nothing reaches a presentation before the facilitator has
  seen the outline. When unsure, Distil asks ("Betyder gul og grøn
  noget?", "Står der kalender eller kollega?") rather than guessing.
- **The output is neutral.** Presentations carry no brand. The app itself
  may show a discreet Lenskjold Consulting logo.
- **The output speaks the language of the notes**, typically Danish or
  English. The UI is Danish.
- **Plain words.** The UI says "sedler", "temaer", "aftalt", "udestår".

## The seven rules (Haij), and the one exception

| Rule                          | How Distil meets it                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 Real open source            | AGPL-3.0. What runs anywhere is this repository, nothing more.                                                                                                                       |
| 2 Self-hosting                | Docker Compose with Postgres on one server. **Accepted exception:** reading and summarising need Mistral's API, so Distil does not work offline (ADR). No other provider is offered. |
| 3 Your data, always           | Export everything (JSON, presentations as PDF) and delete the account with everything it owns.                                                                                       |
| 4 EU or self-hosted           | Mistral (EU) is the only third party besides the hosting. `docs/subprocessors.md` says who sees what, and changes before any new third party does.                                   |
| 5 The AI helps, human decides | A review step before every presentation; Distil's suggestions are marked.                                                                                                            |
| 6 Secure from day one         | RLS, append-only audit log, passkeys and two-step sign-in, limits on AI use, secrets only in the environment.                                                                        |
| 7 Used for real               | Built from the maker's own workshops.                                                                                                                                                |

## Photos and personal data

- Photos may show names and faces. A photo is kept only until the
  facilitator approves its transcript, and **never longer than 24 hours**;
  then it is deleted. The text and the presentation stay in the account
  until the user deletes them.
- Photos are shrunk in the browser before upload (which also drops EXIF
  and GPS data); the server checks type and size again and refuses the
  rest.
- Nothing about a photo is logged: no file names, no image content, no
  model output in logs.
- The demo keeps nothing beyond 24 hours and says so on every page.

## Limits (so a public installation cannot run up the bill)

- A new account may read 10 photos. "Bed om mere" sends a request the
  operator approves; an approved account may read 100. Both are settings.
- A workshop holds at most 50 photos; a photo at most a set size and
  resolution.
- Demo: 10 photos per visit and 300 per day for the whole installation.
- Outlines: 30 per account and 500 per installation per day. Only the
  notes' text goes to Mistral for an outline, as numbered lines.
- A ceiling on Mistral calls per day for the installation, whatever the
  accounts allow. When a ceiling is hit, Distil says so plainly and stops;
  it never queues or silently degrades.

## Architecture

Copied from Prismatic (`C:\Users\Stylf\ClaudeProjekter\prismatic`), not
shared as a package. When a fix in the copied foundation matters to both,
note it for the other project.

- Next.js 16 (App Router), TypeScript strict, Tailwind 4, next-intl with
  Danish messages in `messages/da.json`. Never hardcode UI strings.
- Postgres 16 through node-postgres and Drizzle. Migrations in `drizzle/`,
  applied by `scripts/migrate.mjs` as the owner; hand-written SQL for
  roles, RLS, audit triggers and `delete_account()`. The app connects as
  its own role and does workshop work through `withUser()`, so row-level
  security applies.
- `src/domain`: pure rules (limits, the structure of a summary, outline
  to slides), fully tested. `src/services`: database work, each function
  taking a `Db`, tested against the Postgres test database.
  `src/actions`: server actions that validate with zod and call a
  service. `src/ai`: the only place that talks to Mistral, behind one
  small interface, with fixtures so tests never call the API.
  `src/components`, `src/app`: UI.
- Every new table that holds workshop data ships with `workshop_id` or
  `user_id`, forced RLS, an audit trigger, an entry in `delete_account()`
  if needed, tests for ownership and isolation, and a place in the export.
- Accounts as in Prismatic: e-mail and password, two-step sign-in (TOTP,
  recovery codes), passkeys. The phone can also be linked from a signed-in
  computer by a QR code that only allows adding photos to and answering
  questions in one workshop, and expires within hours.
- Demo mode as in Prismatic (`DISTIL_DEMO=on`): a visit is a throwaway
  account deleted after 24 hours through `delete_account()`.
- Presentations are HTML rendered by the app; PDF through the browser's
  print. PowerPoint comes later and needs its own decision.
- Self-hosted next to Prismatic on the same server (Coolify), on its own
  subdomain. The Mistral key lives only in the environment.

## Visual identity and UX

The same calm, earthy palette as Prismatic. Paper #F7F6F3, white
surfaces, ink #1F2D33, slate #5C6A6F, hairline #DAD6CF, bronze #A88E6E
used sparingly. Colour carries meaning, never decoration: green #4F7A5A
for agreed, amber #B8862F for open points and for "Distil is unsure",
red #A8483F for errors. Post-it colours in a presentation follow the real
notes. Inter, compact controls on the computer, large thumb-sized ones on
the phone. One filled button per view.

- **Phone:** few screens: choose or start a workshop, the camera (many
  photos in one go, or from the gallery), Distil's questions as cards with
  tap answers or voice, and the status of the reading.
- **Computer:** the workshop desk. Steps Afskrift, Disposition,
  Præsentation. Each photo beside what Distil made of it; the outline as
  the thing you edit; a conversation field ("slå 2 og 3 sammen") on every
  step.
- **Presentation:** an overview slide first that can travel alone, then
  the themes laid out like the wall so participants recognise their own
  notes, then recommendations (marked as Distil's), agreed and open
  points, redrawn diagrams, and the transcript as an optional appendix.

## Ways of working

1. Plan first; get approval for anything that changes the principles,
   the limits or what is kept and for how long.
2. Vertical slices; keep the app runnable at every commit.
3. Run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm format` after
   changes and keep them green.
4. One responsibility per file; no file over roughly 300 lines.
5. Conventional commits. Significant decisions get an ADR in `docs/adr/`
   naming the trade-off accepted.
6. Code, comments and docs in English; UI copy in Danish.
7. Ask before adding a dependency or deleting files.
8. Never weaken RLS, the audit log, sign-in or the photo deletion to make
   a feature easier.
9. The user pushes to GitHub themselves; end with the
   `git -C "<path>" push` command to run.
