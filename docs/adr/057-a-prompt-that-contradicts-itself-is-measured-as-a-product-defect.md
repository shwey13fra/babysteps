# ADR-057 — a prompt that contradicts itself is measured as a product defect

Date: 2026-11-05 · Status: accepted · Supersedes nothing · Follows ADR-054

## Context

iter10 put REFUSE at 6/8 against a ≥7/8 bar. Read on disk, iter8 and iter10 fail *different* rows
and R-05/R-06 were both clean in iter8 under the same `answer.v3`. The gate's raw count across all
five samples is 7, 7, 8, 7, 6 — four distinct rows, no row twice. Buying samples cannot raise a
min-based lower bound, so the failures were diagnosed by reading the prompt instead.

`answer.v3` required a refusal to name "where they can get binding information" and, nine lines
later, forbade saying an office "can give binding information" as an unsourced competence claim.
R-06's required element is that exact sentence. Separately, completeness duty 1 ("reproduce a
statutory enumeration in full") ran on R-05 and produced the field-by-field dictation its
`must_not` prohibits — the file instructed the violation.

## Decision

`answer.v4` splits **routing** from **competence** (*only X decides* entails *X is where a decision
comes from*; any other power needs an excerpt), bounds completeness by register (never enumerate the
entries of an artefact you are declining), and gives a product non-goal an `out_of_scope` slot so a
capability limit is stated about the product, not about the user's family.

## Alternatives

Rule R-06's element a golden defect — rejected: the element is legitimate product behaviour and the
prompt is what was broken. Buy more samples — rejected: see above.

## Consequence

Measured on 9 rows for $1.10: REFUSE 7/8, criticals 0. A self-contradictory instruction is now a
defect class to look for *before* attributing a failure to the model or the golden set.
