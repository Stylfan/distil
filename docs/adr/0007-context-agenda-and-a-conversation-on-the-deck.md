# 0007 The facilitator's context, the agenda, and a conversation on the deck

## Context

Photos alone leave Distil guessing what a workshop was for and who the
presentation must convince. A deck for a board differs from one for the
participants. Facilitators usually have an agenda already, on paper, in Word
or in PowerPoint. And after the first deck, they want to say what to change
in plain words rather than edit every slide.

## Decision

- The first tab is now **Materiale**: besides the photos, the facilitator
  answers a few questions (why, who took part, who the presentation is for,
  what it must do for them, anything else) and gives the agenda. It is stored
  as one `context` value on the workshop (migration 0010), so it shares the
  workshop's row-level security, audit trigger, export and deletion.
- The agenda can be typed, taken from a .docx, .pptx or text file (read in
  the browser; only the text is saved, the file never leaves the computer),
  or read from a photo by Mistral. That photo is shrunk in the browser,
  checked on the server, sent to Mistral and forgotten: never stored, never
  logged. It counts against the daily outline limit.
- Speaking is done through the keyboard's own dictation (phone, or Win + H),
  not a browser speech service, which would send the audio outside the EU.
- The context goes with the notes when an outline is made or changed, and
  with the outline when the story is told. The facilitator's words are
  instructions; the notes stay material.
- On **Præsentation**, the facilitator asks for changes ("gør den klar til
  direktionen", "fjern tema 7"). One Mistral call changes the story, may
  leave themes out of the deck (`story.hidden`; they stay in the outline) and
  answers in a sentence. Merging or splitting themes stays a change to the
  outline, under Disposition.
- Six more colour themes, among them calm light ones in the style of
  lenskjoldconsulting.dk, a black-and-white one and a nature one. One theme,
  "Lenskjold Consulting", carries that logo; it is never the default. This is
  the one exception to "presentations carry no brand", and CLAUDE.md says so.

## Trade-off accepted

More text goes to Mistral (the context and agenda), and each request on the
presentation is a call. Both are the facilitator's own choice and counted
against the same limits. A branded theme exists in an otherwise neutral
tool, at the operator's request.
