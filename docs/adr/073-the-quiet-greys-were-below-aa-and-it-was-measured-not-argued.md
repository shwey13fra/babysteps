# ADR-073 — The quiet greys were below AA, and it was measured rather than argued

**Date:** 2026-11-12 · **Status:** accepted

## Context

Phase 6 VERIFY item 13 asks for Lighthouse mobile accessibility ≥ 90. axe-core 4.13.0 (the engine
Lighthouse's accessibility category is built from) was run against seven routes at a true 412px
viewport, with a profile in storage so `/timeline` rendered rather than redirecting.

`color-contrast` was the **only** violation on any route — no label, ARIA, `lang`, focus, heading or
name-role-value failure anywhere, and no incomplete audits. Two tokens accounted for all of it:
`--ink-3` `#7B8F96` at **3.13:1** and `--done` `#93A6AB` at **2.35:1** on `--paper`, where AA wants
4.5:1 below 18.7px. 2026-11-10 predicted exactly this from the hex values; the measurement confirmed
it on rendered pages rather than on arithmetic.

## Decision

Darken both, holding hue: `--ink-3` → `#62747B`, `--done` → `#5C7077`.

The runbook had proposed `--done: #60757B`. It computes to **exactly 4.50:1** — no rounding headroom
— so it was widened to `#5C7077` (4.83:1 on `--paper`, 5.20:1 on `--surface`).

## Alternatives

- **Accept and document.** The calm-clinical palette chose those greys deliberately. Rejected: a
  deadline product whose metadata lines are the dates is not the place to miss AA on purpose, and it
  would leave item 13's bar formally unmet.
- **Fix `--ink-3` only.** It was 21 of 25 nodes on `/timeline`. Rejected: done rows are still text.
- **Raise the type size instead** to clear the 18.7px large-text threshold. Rejected: §3's 13/18
  metadata scale is what makes the timeline read as an instrument.

## Consequence

Zero axe violations product-wide, so item 13 is no longer a judgement call. `--done` now sits within
one step of `--ink-3`, so **colour no longer distinguishes a done row** — the hollow dot and the
dropped chip carry that signal, which ADR-072 had already made load-bearing. docs/design-system.md
§2 is corrected, including a sentence that claimed AA compliance and was false when written.
