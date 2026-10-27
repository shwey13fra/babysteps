# ADR-030 — a critical counts by row identity, not by headline count

## Context

Three identical runs of golden v1.6 under `judge.v2.md` — same code, same prompts, same corpus,
nothing changed between them — produced **12, 15 and 18** criticals. The Phase 5 gate reads the
criticals count. A 50% swing on that number means a prompt change removing four real criticals is
invisible inside the noise, and a change removing nothing can appear to remove six.

Which rows fail is far more stable than how many: 9 rows flared in all three runs, 16 in at least
two, and 4 in exactly one. Retrieval hit was identical (24/30) in all three, so the variance is
entirely in generation and judging.

## Decision

A critical counts only if the row raises it in **at least 2 of 3 runs**. Iteration results are
compared as **sets of row ids**, never as counts.

The baseline for Phase 5 iteration 1 is the **16-row stable set**: A-02, A-03, A-04, A-05, A-07,
A-08, A-11, A-12, A-13, A-16, A-17, A-18, A-19, A-20, A-21, A-28.

A single run's criticals figure is reported as what it is — one sample — and never quoted as a
before/after delta.

## Alternatives

- **Compare single-run counts.** Rejected: measured noise is ±6, larger than any effect iteration 1
  can plausibly produce.
- **Average three runs per side.** Rejected: averaging a count hides which rows moved, and the
  interesting question is always which defect was fixed. Costs the same as the set comparison and
  tells you less.
- **Raise the run count until the count stabilises.** Rejected: the count is unstable because the
  underlying failure set is resampled per run, not because three is too few. More runs narrow the
  mean, not the per-row flicker.

## Consequence

Iteration 1 is judged by whether named rows leave the stable set, and whether any row enters it.
The floor is reusable while golden, `judge` and `answer` prompts are all unchanged, so an iteration
costs one run (~$2.45) rather than four — but any change to the instrument voids it and the three
runs must be re-bought.
