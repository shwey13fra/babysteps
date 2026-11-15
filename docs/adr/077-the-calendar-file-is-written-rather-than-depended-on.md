# ADR-077 — The calendar file is written, not depended on

**Date:** 2026-11-15 · **Status:** accepted

## Context

F5 needs RFC 5545 output. CLAUDE.md rule 5 pre-approves the `ics` package, so taking it would have
needed no permission. It is not installed, so this was a live choice rather than an inherited one.

## Decision

Write `lib/ics/calendar.ts` — about sixty lines of pure function — instead of adding `ics`.

Three reasons, in order of weight:

1. **Folding is counted in octets, not characters** (RFC 5545 §3.1), and this product's content is
   German. `ä` is two octets, so a 70-character line can be 140 octets: a character-counting fold
   returns it unchanged and emits a line a strict parser rejects. That is the single most likely
   way the file fails on a real calendar, and the device check — Google *and* Apple — is the
   expensive place to find out. Sixty lines we can assert directly beats a dependency we would
   test by importing anyway.
2. **UID stability is a product decision, not a formatting one.** Recording a birth moves six dates
   at once (ADR-070). A UID derived from the date would turn each one into a duplicate entry
   instead of an update. That rule belongs in our code, visibly.
3. It is a dependency shipped to the edge for formatting we fully understand.

## Alternatives

- **Use `ics`.** Pre-approved, standard, and would be the right answer if this needed VTIMEZONE,
  recurrence or alarms. It needs none: these are all-day, single-occurrence, timezone-free dates.
- **Use `ics` and test its output anyway.** The tests would be identical; only the dependency
  differs.

## Consequence

`escapeText`, `foldLine`, `toIcsDate` and `buildCalendar` are pure and asserted against the spec,
including a test that a 120-character German line never splits a UTF-8 sequence and never exceeds
75 octets. **If the device check fails on either calendar, this ADR is the first thing to revisit**
— switching to `ics` is a contained change behind `buildCalendar`, and the existing tests would
carry over unchanged.
