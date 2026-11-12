# ADR 0004: A phone link, and an operator set in the database

Status: accepted · Date: 2026-11-12

## Context

The phone takes the photos and the computer is the desk. Signing in on
the phone at the wall is a chore, and the facilitator often already sits
at the computer. Separately, a public installation lets anyone sign up
with a few photos, and someone must be able to give an account more.

## The decision

- **A QR code on the computer** ("Tilføj fra telefon") holds a link
  `/telefon/<token>`: a random 256-bit token of which only the SHA-256 is
  stored (`phone_links`). It lets a phone into **one workshop**, to add
  photos and answer Distil's questions, **for two hours**, and can be
  closed at once from the computer. It shows no notes, no desk, no other
  workshop and no account. Requests through it run as the owner, in that
  workshop only, through their own routes that check the origin; the
  owner's limits apply as always.
- `phone_links` sits **outside row-level security**, like sessions: it is
  looked up before anyone is known. The meta-test in
  `tests/isolation.test.ts` names it as one of the deliberate exceptions.
- **"Bed om mere"**: an account that runs low asks, with a line on why;
  the operator answers yes (the allowance becomes
  `DISTIL_APPROVED_ALLOWANCE`, default 100) or no. A demo visit cannot ask.
- **The operator is `users.is_admin`, set only with a database command.**
  Not by an e-mail address or a setting: addresses are not verified at
  sign-up, so anyone could claim the operator's address first.

## The trade-off accepted

Whoever holds the link, by scanning the code over someone's shoulder or
finding a forwarded message, can add photos to that workshop and answer
its questions for up to two hours, though they see none of its notes. In
return nobody types a password at the wall. The token is in the address,
so it may sit in the phone's browser history; it expires anyway. There is
no e-mail when a request arrives; the sidebar shows the count, which is
enough for one operator and avoids a third party for mail.
