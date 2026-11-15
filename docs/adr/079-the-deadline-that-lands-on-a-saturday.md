# ADR-079 — The deadline that lands on a Saturday

**Date:** 2026-11-15 · **Status:** accepted · **Human ruling:** display-only honesty, no date shifting

## Context

The A3 device check exported two items to a real calendar. **Both landed on Saturdays** —
`vaterschaftsanerkennung` on Sat 26 Dec 2026, which is also 2. Weihnachtsfeiertag, and
`standesamt_birth_registration` on Sat 2 Jan 2027. The product was telling a parent that a
statutory deadline falls on a day the Standesamt does not open. 760 tests, nine machine checks and
an axe pass had never looked at the weekday of a date.

**It is not two days in seven, and that is the finding.** Rule offsets are whole weeks, so every
deadline inherits the **weekday of the anchor**. Measured across seven consecutive due dates, one
per weekday, same profile otherwise:

| Due date falls on | Deadlines on a weekend |
| --- | --- |
| Monday | **0 of 11** |
| Tuesday | 1 of 11 |
| Wednesday | 1 of 11 |
| Thursday | 0 of 11 |
| Friday | 4 of 11 |
| **Saturday** | **10 of 11** |
| **Sunday** | 6 of 11 |

So the risk is **concentrated, not spread**. Roughly two families in seven get almost every date on
a closed day; the rest get almost none. A defect that looks like noise in aggregate is near-total
for the families it touches.

## Decision

**Say it. Do not move it.** Nothing shifts — not in the engine, not in the rule files.

1. **`lib/timeline/working-days.ts`** — `isNonWorkingDay(date, bundesland)`, weekends only,
   plus `weekdayIndex` / `weekdayName`. Derived from `toEpochDay`, never `new Date()`, so it
   carries no timezone.
2. **One sentence, three surfaces, one implementation.** `closedDayLine` on the item page and in
   the calendar DESCRIPTION; `closedDayShort` — *"falls on a Saturday"* — joins the timeline row's
   existing metadata line, because design-system.md §5 gives a row one line and twelve rows cannot
   carry twelve sentences.
3. **The do-next card gets it too.** That card builds rows on a second code path, and updating one
   path and not the other is precisely ADR-075.
4. **A marked-done row drops the clause**, for the same reason it drops the countdown chip
   (ADR-072): the reader has said they went, and the product does not argue with them about a trip
   already made.

## Why no shift — the reasoning that must survive this decision being revisited

- Whether a deadline moves to the next working day is a **legal question with a per-rule answer**.
  German law has a general provision for periods ending on a weekend or holiday, but it does not
  apply uniformly, and the Standesamt week is a **notification duty rather than an ordinary
  Frist**. **We have not verified that provision or its scope against any source in the corpus.**
- Encoding a shift the statute may not grant is **the engine asserting law**, which is exactly what
  rule 4 forbids. The table above makes it concrete: for a Saturday due date, a shift would silently
  move ten of eleven dates on the strength of a rule we have not read.
- The honest version is strictly more useful anyway. A shifted date tells a parent a thing we are
  not sure of; the sentence tells them a thing that is certainly true and lets them decide.

## The wording, narrowed — and the narrowing confirmed

**Settled 2026-11-15: the narrowed wording stands.** It was shipped as a flagged deviation from the
ruling, put back to the human with the reasoning below, and kept. This section is the record of a
closed decision, not an open one.

The original ruling asked for *"the office will be closed."* **That claim is not shipped.** It is a
prediction about one office's opening hours, and nothing in the corpus carries any office's hours —
some Standesämter do open on a Saturday for weddings. Asserting it would be the one thing this
product never does: stating as fact something it cannot cite.

Shipped instead: *"2 January 2027 is a Saturday. German public offices are normally closed at
weekends — check the opening hours before you go."* The date and the weekday are demonstrable, the
norm is general, and the reader is sent to the authority. Same shape as rule 13 everywhere else —
state the rule, name who decides. `tests/ui/closed-day.test.ts` asserts the narrower claim and
asserts the stronger one is absent.

## Public holidays are a documented gap, not an oversight

`PUBLIC_HOLIDAYS` exists, is keyed by Bundesland, and is **empty**. Holidays are per-Bundesland —
Fronleichnam is a holiday in Hesse and a working day in Berlin — a table goes stale, and a stale
table reports knowledge it no longer has, which is the failure mode this product refuses everywhere
else. **It is a corpus problem wearing an arithmetic costume**: it arrives through the ingestion
path with a source and an as-of, or it does not arrive. The test suite asserts the hole out loud —
Friday 25 December 2026 is a public holiday and `isNonWorkingDay` returns `false`.

## Consequence

A parent is told the true thing and the date stays where the statute puts it. The gap is written
down rather than papered over. **Open as a follow-up, not Phase 7:** verify the general
weekend/holiday provision and its application to each of the twelve rules, then decide **per rule**
whether a shift is warranted. That is corpus and verification work.

**And the pattern, for the fourth time:** ADR-073, ADR-075 and now this were all found by a human
looking at a screen. Per-row assertions cannot see a defect that lives between rows; no assertion
about a date had ever asked what day of the week it was.
