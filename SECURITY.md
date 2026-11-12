# Security

Distil holds photos of workshops, which may show names and faces, and
what was written on them. A weakness in it matters, and we want to hear
about it first.

## Reporting a vulnerability

Please report it privately, not in a public issue:

- Use GitHub's private vulnerability reporting on
  [Stylfan/distil](https://github.com/Stylfan/distil/security/advisories/new),
  or
- write to the maintainer through the contact form on
  [lenskjoldconsulting.dk](https://www.lenskjoldconsulting.dk).

Say what you found, how to reproduce it, and what an attacker could do
with it. You will get an answer within five working days. When the fix is
out, you are credited in the release notes unless you would rather not be.

Please do not test against an installation you do not run yourself, and do
not access or change data that is not yours.

## What is in scope

The code in this repository: the web application, its database schema and
migrations, the Docker images and the scripts that run them.

## How Distil protects data

- Every workshop belongs to one account. The database itself enforces it:
  row-level security in Postgres hides other accounts' rows from the
  application's database role, and `tests/isolation.test.ts` proves it.
- Every change to a workshop's data is written to an audit log that the
  application cannot change or delete, and neither can a database superuser
  without disabling the trigger first.
- A photo's image is deleted when its reading is approved and never kept
  more than 24 hours; it is never written to the audit log or the logs.
  The server accepts only a JPEG it can measure, within set bounds, and a
  photo is read only within the account's and the day's limits.
- Reading goes to Mistral's API with a key that lives only in the
  environment; the model's answer is parsed as untrusted input.
- Passwords are stored as scrypt hashes. Accounts can add two-factor login
  with an authenticator app and sign in with a passkey.
- Sessions are random tokens in an HttpOnly, SameSite=Lax cookie; only
  their SHA-256 is stored.
- There are no secrets in the code. CI scans every push for leaked secrets
  and audits the production dependencies for known vulnerabilities.
