# 0006 The presentation tells a story, written from the approved outline

## Context

The first deck was a faithful list of the outline: a heading per theme and
bullets. Facilitators show these decks to clients, and a list of topics does
not travel. Consultancy decks work because every slide says something: an
action title that states the finding, three key messages, a "so what", the
shift from today to tomorrow, the participants' own words, chapters with
breakers, and a consistent visual theme.

## Decision

- The outline document gets an optional `story`: a headline, a tagline, a
  "so what", up to four key messages, a sharp line, an icon and a "so what"
  per theme, up to five shifts, one quoted note (by id, so it is always the
  note's own words) and a closing line. It also gets a `look`, one of five
  neutral colour themes.
- Distil writes the story with one Mistral call from the approved outline
  and the notes' text (numbered lines), on request ("Skriv historien"). It
  counts against the same daily limits as an outline. The answer is untrusted
  and parsed leniently (unknown themes, notes and icons are dropped or
  replaced).
- Without a story the deck is still told by rule (`storyFromOutline`), so a
  presentation never waits for the model. Editing any word of the story on a
  slide starts the outline's own story from that same point.
- Remaking the outline with Distil drops the story, because it was told for
  the outline before; the colour theme stays.
- The deck is told in chapters (what we found, what it means, what we do now)
  with breakers, a map of the themes, a slide per theme with its post-its, a
  quote, the shifts, and a closing slide. The PowerPoint file follows the same
  slides and colours.

## Trade-off accepted

One more Mistral call per presentation (a few øre), and headlines that are
Distil's interpretation. They are proposals in the same sense as the
recommendations: the facilitator sees them before anything leaves Distil and
can change every word on the slides. Recommendations stay marked as Distil's.
