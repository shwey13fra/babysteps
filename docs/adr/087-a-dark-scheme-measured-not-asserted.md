# ADR-087 — A dark scheme, measured rather than asserted

**Date:** 2026-11-18 · **Status:** accepted · **Phase 7**

## Context

The product had **no dark mode at all.** Not an incomplete one — none. There was no
`prefers-color-scheme` rule anywhere in `app/globals.css`, no `color-scheme` declaration, and a
hard-coded `#fff` on `.btn-primary`.

This was not recorded as missing. The Stage F device list carried "dark mode" among the items
reported as "everything works" without numbers, which the 2026-11-17 journal recorded as
**unmeasured** — and unmeasured reads as built-but-unverified, not as absent. It was absent.

The exposure is specific. A phone set to dark would have been served the light page, and
`color-scheme` being undeclared means the browser also picks its own colours for the date input on
`/intake` and `/birth` — a UA widget this product does not draw — and for the flash before first
paint. Those are the two screens where a wrong date is the whole failure.

## Decision

A full second token set, as `design-system.md §2b`, plus two new tokens that exist in **both**
schemes:

- **`--on-de`**, the label on a `--de` fill. This is the pairing a dark scheme cannot inherit: in
  dark, `--de` is a light teal and the white that was hard-coded reads at about **1.4:1**.
- **`--skeleton`**, the wait-state bars, previously `#edf1f1` — a bright flash in a dark room.

`color-scheme: light dark` is declared on `:root`.

**Every value was measured before it was written down.** `tests/ui/contrast.test.ts` computes all
21 pairings from the stylesheet itself, in both schemes, and fails with the pairing and the number.
Worst in dark **5.91:1**, worst in light **4.53:1**.

## Alternatives

**Invert the light set.** Rejected: an inversion puts the two track colours somewhere that is no
longer recognisably the German green and the consular violet, and the dual-track split is the
product's differentiator.

**Run axe-core once and record the result.** Rejected, and this is the substance of the decision.
`axe-core` is present in `node_modules` only transitively and is not a declared dependency, so a
gate built on it is one `npm install` from disappearing. More importantly a one-off audit is
exactly what produced ADR-073: §2 carried "every pairing clears WCAG AA" for three weeks while
`--ink-3` sat at 3.13:1 and `--done` at 2.35:1. A computed test fails in CI; an audit fails in
memory.

The arithmetic is checked against the browser before it is trusted: the suite reproduces both of
ADR-073's axe-core measurements (3.13 and 2.35) from the pre-fix hexes, and pins black-on-white at
21:1 and a colour on itself at 1:1.

## Consequence

`design-system.md §2`'s AA sentence is now guarded in both schemes rather than being a claim, and
so is ADR-072's rule that `--done` stays within one step of `--ink-3` so colour never marks a done
row. A new hard-coded colour anywhere in the interface — outside `@media print` and the landing's
illustration, both exempt — also turns the suite red, because a hex is a value dark mode cannot
reach.

**What is NOT claimed.** No dark page has been checked on a real device, and no screen-reader pass
was run. The ratios are arithmetic over the declared tokens; they say nothing about a token that is
correct and then used in the wrong place.
