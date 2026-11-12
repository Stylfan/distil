# ADR 0001: Mistral reads the photos

Status: accepted · Date: 2026-11-12

## Context

Distil's whole point is to read handwriting on post-its, whiteboards and
flip-overs, and later to understand and redraw what it shows. That needs a
vision model far beyond what a small server can run. Haij's second rule
asks that everything essential works without the internet, and the fourth
that data stays in the EU or on one's own server.

## The decision

- **Reading is done by Mistral's API**, a French company that processes
  API data in the EU, and by no other provider. There is no setting for
  another provider or one's own model: one path, kept simple and checked.
- **The model is a setting** (`DISTIL_MISTRAL_MODEL`, default
  `mistral-medium-latest`, a vision model), and so is the API's address
  (`DISTIL_MISTRAL_URL`). The model's answer is asked for as JSON and
  treated as untrusted input: parsed leniently, clamped, and stored as
  plain text (`src/domain/reading.ts`). Text on a photo is material, never
  instructions.
- **One door.** Everything that reads goes through `src/ai/reader.ts`, so
  tests use a stand-in and never call Mistral, and `DISTIL_READER=fake`
  gives made-up notes on a development machine without a key.
- **Mistral sees as little as possible:** one photo at a time, shrunk in
  the browser to at most 2000 px and re-encoded, which drops EXIF and GPS
  data; no names, no accounts, no other notes.
- **Limits before the bill:** an allowance per account, a ceiling per day
  for the installation, counted atomically before a photo is sent and
  given back when the reading fails (`src/services/limits.ts`).

## The trade-off accepted

Distil breaks Haij's second rule on purpose: without the internet and
Mistral, no photo is read (everything else still works). And a third party
sees the photos, which may show people, for the moment it reads them, and
may keep them up to 30 days for abuse monitoring unless the operator
arranges zero retention. In return the reading is good enough to be worth
using, it stays in the EU, and the code stays small. The OCR model
(`mistral-ocr-latest`) is not used yet: it returns text without the
colours and places Distil needs; it is to be compared on real photos.
