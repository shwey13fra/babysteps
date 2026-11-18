# ADR-086 — The brochure may move, the instrument may not

**Date:** 2026-11-18 · **Status:** accepted · **Phase 7**

## Context

`design-system.md §6` said one transition exists in the whole product — the birth-date diff on
F2b — and **nothing else moves.** That rule was written to protect an anxious reader from an
interface that flashes at her while she reads a statutory deadline.

The landing sequence agreed on 2026-11-17 breaks it: a six-second animated hero on `/`. It also
runs against the human's own Stage G note, which called Google's stork-and-teddy-bear illustration
*"exactly the register mismatch this design works to avoid."*

Both objections are about the same thing, and both are **correct about the screens that make
claims.** Neither is about `/`. `/` is the only screen in the product whose job is *"this is for
me"* rather than *"this is accurate"*: nothing on it is counted from a due date, nothing on it
cites a statute, and nobody acts on it. The reason §6 exists does not reach it.

## Decision

**Motion and warmth are permitted on `/` before any due date has been entered. Nowhere else.**

`/timeline`, `/item/[id]`, `/birth`, `/ask` and `/share/[token]` keep the single birth-date-diff
transition and nothing more. The cartoon register stops at the CTA; the first screen after it is
`/intake`, which is drawn exactly as it is today.

This is a **fence, not a repeal.** §6 is amended to carry the fence rather than deleted.

## Alternatives

**Repeal §6.** Rejected: it would license motion on the timeline, which is the one screen a
frightened person reads for a date.

**Keep §6 and ship a static landing.** Defensible, and it was offered. Rejected by the human on
2026-11-18: the unproven thing is whether a tired parent reading in a second language chooses to
start, and that is a first-impression problem a paragraph does not solve.

## Consequence

The fence has to be enforced by something other than good intentions, because it is one `className`
away from leaking. `tests/ui/landing.test.ts` asserts that every animation selector added for the
landing is scoped under `.landing`, and the control — unscoping one of them — turns it red.

`prefers-reduced-motion` still collapses the sequence, so the fence never costs a reader who has
asked for stillness.
