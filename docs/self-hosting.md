# Running Distil on your own server

Distil runs on one server with Docker Compose: one Postgres, a migration
step and the app. The one outside service it needs is Mistral's API, which
reads the photos ([ADR 0001](adr/0001-mistral-reads-the-photos.md)).

## What you need

- A Linux server with Docker and the Compose plugin. 1 CPU and 1 GB of
  memory is enough for a handful of facilitators; it runs fine beside
  Prismatic on a 4 GB server.
- A domain name pointing at the server, and a reverse proxy that serves it
  over HTTPS (Caddy, nginx, or Coolify's built-in Traefik). Passkeys,
  secure cookies and the phone's camera need HTTPS.
- A Mistral API key from [console.mistral.ai](https://console.mistral.ai).
  In the console, check that your data is not used for training, and ask
  for zero data retention if your plan offers it; then say what you chose
  in the privacy texts (`messages/da.json`, `legal`).
- To stay within Haij's fourth rule, an EU-owned provider on EU soil, for
  the server and for the backups. See [who can see what](subprocessors.md).

## First start

```bash
git clone https://github.com/Stylfan/distil.git && cd distil
cp .env.production.example .env.production
```

Fill in `.env.production`. Make each of the three secrets with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
or `openssl rand -base64 32`, set `DISTIL_URL` to the public address and
`MISTRAL_API_KEY` to your key. Then:

```bash
docker compose --env-file .env.production up -d --build
```

Compose starts Postgres, waits for it, runs the migrations (which also set
the application role's password), and starts the app on `127.0.0.1:3001`.
Point the reverse proxy at that port. With Caddy, the whole configuration
is:

```
distil.example.dk {
  reverse_proxy 127.0.0.1:3001
}
```

Open the address and create the first account. Anyone may create an
account unless `DISTIL_SIGNUP=closed`. Turn on two-step sign-in or add a
passkey under **Konto**.

## Limits

So a public installation cannot run up the bill at Mistral:

| Setting                             | Default | What it does                                                          |
| ----------------------------------- | ------- | --------------------------------------------------------------------- |
| `DISTIL_PHOTO_ALLOWANCE`            | 10      | Photos a new account (or demo visit) may have read in all             |
| `DISTIL_DAILY_PHOTO_LIMIT`          | 300     | Photos the whole installation may have read per day (UTC)             |
| `DISTIL_DAILY_OUTLINES_PER_ACCOUNT` | 30      | Outlines Distil may make or change for one account per day            |
| `DISTIL_DAILY_OUTLINE_LIMIT`        | 500     | Outlines for the whole installation per day                           |
| `DISTIL_APPROVED_ALLOWANCE`         | 100     | Photos an account may have read in all once "Bed om mere" is approved |
| (in the code)                       | 50      | Photos per workshop                                                   |
| (in the code)                       | 100     | Images an account may have waiting to be checked at once              |
| (in the code)                       | 4 MB    | Largest photo the server takes; the browser shrinks to ~0.5 MB        |

An account that runs low gets a "Bed om flere billeder" button on its
front page. The operator sees the requests under **Anmodninger** and
answers yes (the account may then have `DISTIL_APPROVED_ALLOWANCE` read
in all) or no. There is no e-mail yet; the sidebar shows how many wait.

The operator is an account marked as admin in the database, never by an
address or a setting, because addresses are not verified and anyone could
sign up with the operator's. Create your own account first, then:

```bash
docker compose --env-file .env.production exec db \
  psql -U postgres -d distil -c "update users set is_admin = true where email = 'you@example.dk';"
```

## Hosting it for others

Say who runs the installation with `DISTIL_OPERATOR_NAME` and
`DISTIL_OPERATOR_EMAIL` (and `DISTIL_OPERATOR_ADDRESS`, `DISTIL_HOSTING`):
Distil then shows a privacy policy and terms in that name, which name
Mistral as the one who reads the photos, and links them from the sign-in
pages and the account page. Have them read by someone who knows the law
where you are. See [who can see what](subprocessors.md).

## Running a demo

Set `DISTIL_DEMO=on` to make the installation a demo instead: the front
page has one button that gives a visitor a throwaway account, no e-mail
and no password, with the same allowance of photos; everything is deleted
after 24 hours. Nobody can sign up unless `DISTIL_SIGNUP=open`. Every page
says it is a demo and links to the code (`DISTIL_SOURCE_URL`).

## Photos

A photo's image is kept in the database only until the facilitator
approves what was read, and never longer than 24 hours; then it is
deleted, whoever it belongs to, by a database function the app calls at
most every ten minutes while it is in use. The images are never written to
the audit log, the logs or the disk. Backups taken while an image waits
contain it; they expire on their own schedule (see below).

## Backups

Everything lives in the `pgdata` volume. Back it up with `pg_dump`, for
example nightly from cron, and keep the copies somewhere other than the
server, for at most 7 days (the privacy policy says so):

```bash
docker compose --env-file .env.production exec -T db \
  pg_dump -U postgres -Fc distil > distil-$(date +%F).dump
```

Keep `.env.production` with the backups. Without `DISTIL_SECRET`, codes
from authenticator apps no longer work (recovery codes and passkeys do).
To restore, start an empty `db`, then
`pg_restore -U postgres -d distil --clean --if-exists` the dump, and start
the rest.

## Updating

```bash
git pull
docker compose --env-file .env.production up -d --build
```

The migration step runs on every start and applies what is new.

## Without the internet

Haij's second rule asks that everything essential works offline. Distil
cannot read photos offline, by design (ADR 0001); everything else (the
workshops, the notes, the corrections, the export) works without it.
Distil makes no other network calls of its own: the typeface ships with
the code, there is no analytics, no telemetry (the image sets
`NEXT_TELEMETRY_DISABLED=1`) and no mail.

## Your data

Every account can download everything it owns as JSON under **Konto**,
and delete itself with everything it owns, the audit log of its workshops
included.
