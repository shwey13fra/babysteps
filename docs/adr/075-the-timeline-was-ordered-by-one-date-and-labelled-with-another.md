# ADR-075 — The timeline was ordered by one date and labelled with another

**Date:** 2026-11-14 · **Status:** accepted

## Context

Found on a real phone during the Phase 6 stopwatch run. The gutter read
**14 Jan → 13 May → 20 May → 13 May**: the date column a parent actually reads was running backwards.

`buildTimeline` sorts items by `window_open` (`lib/timeline/index.ts:100`), because that is when a
step becomes possible. The row model renders `keyDate` — `deadline.date ?? window_open`
(`lib/timeline/key-date.ts:29`) — because the deadline is what the screen is for. Those are two
different dates. Whenever they disagree the rendered sequence is not monotonic: four backward jumps
for a due date of 2027-07-01, and four for the `/dev/timeline` profile too, so this was never
specific to one profile.

It was already inconsistent internally: the before/after-today split in `toView` keys off
`row.iso`, which *is* `keyDate`, so the split and the ordering were derived from different dates.

Thirteen VERIFY items, nine machine checks and an axe pass over eight routes all missed it, because
every one of them asked about a row's own properties — chip colour, dot style, contrast, overflow —
and none asked about the relationship *between* rows. A screenshot caught it in one glance.

## Decision

Sort rows by `iso` then `id` in `toView` (`lib/ui/timeline-rows.ts`), at the presentation layer.

The engine is untouched. `window_open` order is the `/api/timeline` contract and the eval harness's
input; what was wrong is only what the screen shows, so that is the only place that changes.

## Alternatives

- **Change the engine sort to `keyDate`.** Rejected: it would move the API contract and the eval
  harness's input to fix a rendering defect.
- **Render `window_open` in the gutter.** Rejected: it makes the label match the order rather than
  the order match the label, and the deadline is the reason the screen exists.
- **Accept and document.** Rejected: a deadline product whose dates run backwards is not a
  cosmetic issue.

## Consequence

The gutter is monotonic, and the before/after split now agrees with the ordering it sits inside.
Three regression tests assert chronological order on two profiles plus the id tie-break. The lesson
is recorded in `knowledge/past-mistakes.md`: **per-row assertions cannot see an ordering defect, and
nothing in a thirteen-item checklist asked how rows relate to each other.**
