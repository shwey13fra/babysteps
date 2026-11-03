# ADR-043: Coverage exclusions are declared data, validated before a run

Date: 2026-11-03 · Status: accepted · Implements the ADR-019 amendment of 2026-11-02

## Context
ADR-019's amendment requires every report to carry both the scorable and the all-elements
coverage figure, with exclusions listed individually and dated. `run.ts` had **no exclusion
mechanism at all**: it counted every ANSWER element, and the two reports that excluded the
consular 8 did so in prose written by hand. The code was never flattering; the narration was.

## Decision
`data/golden/coverage-exclusions.yaml` declares each excluded element by **row id + requirement
text** (post-`parseElement`). `run.ts` computes both figures, prints both unconditionally — equal
when nothing is excluded — and lists every entry with reason, ADR and date. `validateExclusions`
throws before the first model call unless each entry matches exactly one requirement of its row.

## Alternatives
Key by element index — rejected, a reordered cell would silently exclude a different element.
Warn instead of throw — rejected, a stale entry would move a committed figure with no diff.

## Consequence
An exclusion is now auditable and breaks the run when it rots. Pre-existing `scores` keys keep
their all-elements meaning, so figures recorded before today stay comparable.
