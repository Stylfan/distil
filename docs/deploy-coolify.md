# Deploying Distil with Coolify

How Distil goes on the server beside Prismatic, at
`https://distil.lenskjoldconsulting.dk`, with the presentation of it on
`lenskjoldconsulting.dk`. One address serves both the phone and the
computer: the page adapts to the screen, and a phone can add it to its
home screen and open it like an app.

## 1. DNS

At the DNS provider for `lenskjoldconsulting.dk`, add an `A` record:

| Name     | Type | Value                                       |
| -------- | ---- | ------------------------------------------- |
| `distil` | A    | the server's IPv4 (the same as Prismatic's) |

and an `AAAA` record with the IPv6 if the server has one. Coolify's
Traefik gets the HTTPS certificate by itself once the name points at the
server.

## 2. The resource in Coolify

1. **+ New → Resource**, in the same project and server as Prismatic.
2. **Public repository** (or the GitHub App, for deploys on push):
   `https://github.com/Stylfan/distil`, branch `main`.
3. **Build pack: Docker Compose**, file `docker-compose.yml`.
4. On the service **app**, set the domain to
   `https://distil.lenskjoldconsulting.dk:3000` (the port is the
   container's, not the host's). Leave `db` and `migrate` without a domain.

## 3. Environment

In the resource's **Environment Variables**. Make each secret with
`openssl rand -base64 32` (or the `node -e` line in `.env.production.example`).

| Variable                  | Value                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`       | a new secret                                                         |
| `DISTIL_APP_PASSWORD`     | another new secret                                                   |
| `DISTIL_SECRET`           | a third new secret; never change it once people use two-step sign-in |
| `DISTIL_URL`              | `https://distil.lenskjoldconsulting.dk`                              |
| `MISTRAL_API_KEY`         | the key from console.mistral.ai                                      |
| `DISTIL_DEMO`             | `on`: the front page offers a demo that is gone after a day          |
| `DISTIL_SIGNUP`           | `open`: real accounts beside the demo                                |
| `DISTIL_OPERATOR_NAME`    | `Lenskjold Consulting`                                               |
| `DISTIL_OPERATOR_EMAIL`   | the address people may write to about their data                     |
| `DISTIL_OPERATOR_ADDRESS` | address and CVR, one line (optional)                                 |
| `DISTIL_HOSTING`          | e.g. `Hetzner Online GmbH i Tyskland`                                |
| `DISTIL_SOURCE_URL`       | `https://github.com/Stylfan/distil`                                  |

The limits keep their defaults unless set (`docs/self-hosting.md`,
"Limits"). Mark the secrets as secret in Coolify so they are not shown in
build logs.

## 4. Deploy

Press **Deploy**. Compose builds the image, starts Postgres, runs the
migrations once (the `migrate` service stops when done; that is expected)
and starts the app. Then:

- `https://distil.lenskjoldconsulting.dk/api/health` answers `{"ok":true}`.
- The front page shows the demo button, sign-in and sign-up.
- On a phone: open the address, then **Del → Føj til hjemmeskærm**
  (iPhone) or **⋮ → Installer app** (Android). The icon opens Distil full
  screen.

With the GitHub App connected, every `git push` to `main` deploys again;
otherwise press **Redeploy** after a push.

## 4b. Make yourself the operator

Sign up on the site with your own address first, at once, before you
share the link. Then, in Coolify, open the **Terminal** of the `db`
container and run:

```bash
psql -U postgres -d distil -c "update users set is_admin = true where email = 'din@adresse.dk';"
```

Reload the site: the sidebar now has **Anmodninger**, where requests for
more photos arrive. Only a database command makes an operator, never an
address or a setting, because nobody's address is verified at sign-up.

## 5. Memory and backups

Distil adds its own Postgres and a Node server, together a few hundred MB,
beside Prismatic on the 4 GB server. Photos wait in Postgres for at most a
day, so the database stays small.

Back up the `pgdata` volume of this resource as in `docs/self-hosting.md`,
keeping copies at most 7 days, as the privacy policy says.

## 6. On lenskjoldconsulting.dk

The page about Distil links to `https://distil.lenskjoldconsulting.dk`
for both phone and computer: one button, "Prøv Distil", is enough. A QR
code with the same address beside it lets a visitor on a computer open it
on the phone at once. Nothing on the homepage needs to know about Distil
beyond the link.
