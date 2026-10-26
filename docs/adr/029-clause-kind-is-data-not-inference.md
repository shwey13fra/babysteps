# ADR-029: A required-element clause carries its kind as data; the harness never infers it

Date: 2026-10-26 · Status: **accepted**

## Context
`run.ts` passed `requiredElements: row.category === "ANSWER" ? requiredElements : []`, so on the
18 DEFLECT and REFUSE rows every required element went ungraded through all three baselines.
"urgent framing" and "no clinical assessment" on M-03 were never checked — exactly as "no alarm"
was not, through the three runs that produced DEFLECT 9/10 and 10/10. Those category figures were
measured against the `redirect_present`, `urgency_present` and `refusal_present` booleans alone.

The column cannot simply be switched on, because it holds three kinds of clause: **requirements**
(`urgent framing`), **permissions** (`may state that it is a medical decision` — M-05 has three),
and **prohibitions** (`no clinical assessment`, `zero numbers anywhere in the reply`). Grading a
permission as coverage fails a reply for declining something optional. Grading a prohibition as
coverage double-counts `clinical_content` and the ADR-023 digit rule, through the weaker channel.

A classifier inferring the kind from the prose was written, then tested against all 140 clauses
**before** being adopted. It is wrong on five, and every error is on an ANSWER row that works
today. `^may` misses the permissions in R-01 and R-03 (`federal part may be answered only if
cited`); widening to `\bmay\b` then captures three requirements — A-01's `woman may expressly
waive`, A-14's `separate on-call fee may be charged privately`, A-18's `that certificate may be
issued at the earliest 7 weeks before the due date` — because the subject of "may" is the law's
subject, not the reply. A leading `no`/`zero` test captures A-14's `no doctor's referral needed`
and A-19's `no`, both requirements the answer must *state*.

## Decision
The kind is written in the golden set as an explicit marker and read with no inference:
`may: <clause>` is a permission, `not(<channel>): <clause>` a prohibition, anything unmarked a
requirement. Golden **v1.6** marks 5 permissions and 6 prohibitions across 10 rows; the other 129
clauses are requirements and unchanged. Requirements are graded by the judge **on every row**.
Permissions are reported as permitted and scored neither way. A prohibition is scored by the
channel it names — `clinical` or `digits` — and one whose channel is unknown, unnamed, or does not
run on that row's category makes the **row NOT MEASURED**, never a pass.

`required_elements_coverage` stays ANSWER-only, because Phase 5's exit gate is stated against it
and runs 1–3 measured it that way. DEFLECT and REFUSE coverage is reported as separate lines.

## Alternatives
Infer the kind from the prose — rejected, falsified above; each error silences a live check.
A parallel `element_kinds` column with an arity guard — viable, and keeps
`required_answer_elements` byte-stable across versions, but puts the kind away from the clause it
describes, so editing one column and not the other is a run-time discovery. Score the prohibitions
as elements too — rejected, it routes a medical-leak check through the channel that cannot raise a
critical. Leave the gap — rejected, it is the gap that makes "DEFLECT 10/10" unfalsifiable.

## Consequence
**DEFLECT and REFUSE pass rates are expected to fall**, and a fall is this check starting to work
rather than a regression; the report says so in its own words. The size of the drop is **not
measured** — the Anthropic account is out of credits, so no run was possible. This ADR records a
prediction, not a result, and the first run against v1.6 settles it.

The judge rubric changes meaning, so it is **`judge.v2.md`**, not an edit to v1: every past report
records `judge.v1.md`, and that label must keep identifying one rubric.

The parser lives in `scripts/eval/clauses.ts` rather than `run.ts` because `run.ts` calls `main()`
at module scope — a test importing it to reach the parser starts a 48-row eval run as a side
effect. Observed, not theorised: the first version of the test did exactly that.

Markers are now load-bearing. A clause written without one is a requirement by default, which is
the safe direction (it gets graded), but a *permission* written without one will be graded as
mandatory and fail its row. `tests/eval/clauses.test.ts` asserts the live set classifies cleanly
and that all 6 prohibitions resolve to a channel, so a bad marker fails the suite, not a run.
