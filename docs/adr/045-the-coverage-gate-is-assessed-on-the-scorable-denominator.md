# ADR-045: The coverage gate is assessed on the scorable denominator

Date: 2026-11-03 · Status: accepted · Depends on ADR-019 (amendment), ADR-043

## Context
The playbook's Phase 5 exit gate reads "required-elements ≥75%" and predates any notion of an
excluded element. ADR-043 now computes two figures, so "75%" became ambiguous: 75% of 95
all-elements is 72 elements; 75% of the 87 scorable is 66. The difference decides whether the
gate is reachable by prompt work. Classes E+F+G are 13 prompt/retrieval-fixable elements:
67/95 = 70.5% (fails) but 67/87 = 77.0% (passes). `2026-10-31-coverage-classification.md:31`
concluded the gate "cannot be closed by prompt and retrieval work alone" — true only on the
all-elements reading, which was the only one that existed when it was written.

## Decision
The gate is assessed on the **scorable** figure: **66 of 87**. A gate should measure what the
system could possibly get right. The 8 excluded elements are declared individually, dated, and
ADR-justified in `coverage-exclusions.yaml`, and `run.ts` throws if that declaration rots.

## Alternatives
Keep 75% of all 95 (72 elements) — rejected, it holds the answer layer hostage to consular
transcription that is a human-with-a-browser task, not an answer-quality defect. Require both
figures to clear 75% — rejected for the same reason, in a stricter form.

## Consequence
The bar drops from 72 covered elements to 66; from 55 today, **+11**. The all-elements figure is
still printed beside it on every report and is never dropped, so the cost of the exclusion stays
visible. If an excluded element ever becomes ingestable, it returns to the denominator and the
bar rises — the exclusion list is the audit trail for that.
