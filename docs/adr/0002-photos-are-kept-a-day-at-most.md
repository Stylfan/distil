# ADR 0002: Photos are kept a day at most

Status: accepted · Date: 2026-11-12

## Context

A photo of a workshop wall may show names, faces and things said in
confidence. The facilitator needs the photo while checking what was read,
side by side with the notes, and not after. The foundation is copied from
Prismatic: Postgres with forced row-level security and an append-only
audit log written by triggers.

## The decision

- **Images live in their own table, `photo_images`**, apart from the
  photo's record (`photos`). Row-level security applies to it like every
  workshop table, but it has **no audit trigger**: the audit log, which
  nobody may edit, must never hold a copy of a picture.
- **An image goes when the facilitator approves the reading**, and in any
  case **24 hours after upload** (`expires_at`). Past that time it is never
  served or read, even before it is deleted. The deletion is
  `purge_expired_images()`, a database function that may only delete
  expired images and mark their photos; the app calls it at most every ten
  minutes while it is in use, so no scheduler is needed.
- **Images are in Postgres, not on disk**, so deletion, isolation and
  account deletion follow the same rules as everything else.
- **The browser shrinks and re-encodes every photo**; the server accepts
  only a JPEG whose size it reads from the file's own header, within set
  bounds, and holds at most 100 waiting images per account.
- **Reading is a route, not a server action** (`/api/photos/[id]/read`),
  because the browser runs server actions one at a time and a reading takes
  seconds; the route checks the request's origin, and the session cookie is
  SameSite=Lax.

## The trade-off accepted

An image whose time is up can stay in the database until someone next
uses the app, though it can no longer be seen; and a nightly backup taken
while an image waits keeps it until that backup expires. In return there
is no scheduler, no file storage to secure, and one place where the rules
hold. Photos in Postgres make the database larger while they wait, which
the per-account and per-workshop limits keep small.
