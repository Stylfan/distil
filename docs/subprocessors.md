# Who can see what

This page lists every third party that can see the data in a Distil
installation, so you can check that nothing leaves the places you chose.
It changes before any new third party is added.

## The software itself: Mistral, and nobody else

| Who                     | What they can see                                                                                                                                       | When                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Mistral AI (France, EU) | One photo at a time, shrunk and without EXIF data, and the text it reads off it                                                                         | Each time a photo is read                                                             |
| Mistral AI (France, EU) | A short recording of the facilitator's voice, when they press the microphone in a field, and the text heard in it; never stored                         | Each time the facilitator speaks instead of typing                                    |
| Mistral AI (France, EU) | A photo of a workshop's agenda, when the facilitator chooses one, and the text read off it; never stored                                                | Each time an agenda is read from a photo                                              |
| Mistral AI (France, EU) | The text, colour and kind of a workshop's notes, the outline, the facilitator's context (purpose, participants, audience, agenda), answers and requests | Each time Distil makes or changes an outline, or writes the story of the presentation |

Distil sends a photo to Mistral's API when it is read (and a photo of the agenda when the facilitator asks for it to be read, and a recording when they speak instead of typing), and the notes' text when an outline is made or changed or the story of the presentation is written, and nothing else: no account details, no workshop names, no note ids (notes go as numbered lines). Mistral processes
API data in the EU and, by its terms, may keep what it receives for up to
30 days to detect abuse. Whoever runs an installation should check in the
Mistral console that the data is not used for training, ask for zero data
retention where the plan offers it, and say what they chose in the
privacy policy. Choosing Mistral, and no other provider, is
[ADR 0001](adr/0001-mistral-reads-the-photos.md).

Apart from that, Distil makes no network calls of its own: no analytics,
no telemetry, no error reporting, no fonts or scripts from a CDN (the
typeface is part of the repository), no mail.

Next.js, which Distil is built on, can collect anonymous telemetry when it
builds or runs the development server. The Docker image switches it off
(`NEXT_TELEMETRY_DISABLED=1`); on your own machine, run
`pnpm exec next telemetry disable` once.

## Where you run it: whoever you choose

| Who                   | What they can see                                      | When                                                                                                       |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Your own machine      | Everything                                             | Run locally, as the README describes                                                                       |
| Your hosting provider | Everything stored on the server, and the traffic to it | When you run Distil on a server. Choose an EU-owned provider on EU soil to stay within Haij's fourth rule. |
| Your backup storage   | The database backups, with any image still waiting     | If you back up off the server ([self-hosting](self-hosting.md))                                            |

## When you host it for others

Run Distil for other people and you are responsible for their data, and
for having a data processing agreement with your hosting provider and with
Mistral. Set `DISTIL_OPERATOR_NAME`, `DISTIL_OPERATOR_EMAIL`, and if you
like `DISTIL_OPERATOR_ADDRESS` and `DISTIL_HOSTING`: the sign-in pages
then link to a privacy policy (`/privatliv`) and terms (`/vilkaar`) in
your name. The texts are in `messages/da.json` under `legal`; have them
read by someone who knows the law where you are before you open the doors.

## Passkeys and authenticator apps: on your own devices

A passkey lives on the device or in the password manager that made it;
Distil keeps only its public key. An authenticator app keeps its secret on
the phone; Distil keeps an encrypted copy to check the codes. Neither
involves a third party.
