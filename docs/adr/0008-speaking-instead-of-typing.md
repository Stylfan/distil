# 0008 Speaking instead of typing, through Mistral

## Context

Facilitators want to talk to Distil instead of typing: the context of a
workshop, a request for the outline or the presentation, an answer to one
of Distil's questions. A keyboard's own dictation works on a phone and with
Win + H, but most people do not know it is there; a small microphone in the
field is what they look for.

The browser's built-in speech recognition (Web Speech API) is free, but in
Chrome it sends the audio to Google, outside the EU and outside the one
third party Distil has.

## Decision

- Every field where the facilitator writes to Distil has a small
  microphone. Pressing it records in the browser (MediaRecorder; the
  browser asks for the microphone once), pressing again or two minutes
  later sends the recording to `/api/dictate`, which has Mistral's own
  transcription model (Voxtral, EU) turn it into text, and the words are
  added to the field. The facilitator sees them before anything is saved
  or sent on.
- The recording is never stored and nothing about it is logged.
- Limits: 100 recordings per account and 1000 per installation per day,
  two minutes and 3 MB each at most (`DISTIL_DAILY_DICTATIONS_PER_ACCOUNT`,
  `DISTIL_DAILY_DICTATION_LIMIT`). When a limit is hit, Distil says so
  and the field still takes typing.
- The `Permissions-Policy` header allows the microphone for Distil's own
  pages only (`microphone=(self)`).

## Trade-off accepted

Speech costs money at Mistral (about 2 øre per minute) where the browser's
recognition would be free, and the facilitator's voice is sent to Mistral.
Both are the price of keeping Distil to one EU third party.
