# ADR-036: The pronoun is not the individual-case test

Date: 2026-10-31 · Status: **accepted** · Human decision, taken at session open

## Context
Three ANSWER rows refused `individual_case` with good retrieval: A-10 (Kindergeld amount, cosine
0.660), A-25 (citizenship at birth, 0.576), A-27 (newborn residence permit, 0.550). All three ask
what the law provides; all three were phrased with "we" or "our". A-27 covered **3/3** of its
required elements inside the refusal text and failed only on the status mismatch.

Rule 13 forbids assessing this user's case. `answer.v2.md` already said "give the general rule"
and "quoting a threshold the law sets is fine", but gave no test, so the model keyed on the
pronoun and withheld public law from the person it was written for.

## Decision
The human ruled: **state the rule, never the verdict.** `answer.v2.md` now carries a two-step
test — (1) answerable by stating what the law provides for everyone → answer it, cited, naming
the authority that decides; (2) requires deciding which side of a condition *this family* falls
on, or calculating what *they* would receive → only then refuse.

## Alternatives
Keep refusing any "our" question — maximally safe, and leaves three rows scoring zero by
construction. Rejected by the human as over-applying the product's own safety rule.

## Consequence
Rule 13 is unchanged and unweakened; no entitlement, amount or outcome for this family. REFUSE
rows R-05, R-06 and R-08 must keep refusing — that is the measured risk this change carries.
Coverage effect is small by arithmetic: +3 elements at most (see
`eval/reports/2026-10-31-coverage-classification.md`).
