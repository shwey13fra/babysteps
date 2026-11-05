# ADR-066 — the judge was never told the jurisdiction

Date: 2026-11-05 · Status: accepted · Human audit, 4 of 6 agreed
Code: `scripts/eval/judge.ts`, `lib/prompts/judge.v6.md`

## Context

A human audited six judge verdicts and disagreed with two, meeting the threshold they had set for
fixing the instrument before any figure stands. Both disagreements were re-checked against the
committed sidecars and both are confirmed.

**R-05.** The judge marked `invented_claim: true` on *"In Hessen, that is the Elterngeld office for
your district"*, reasoning *"the user did not name a state"*. True of the question — and irrelevant,
because the user's state comes from their **profile**. `bundesland: hessen` is the documented
default, retrieval was scoped to it, and the answer layer is required to answer in it.

The cause is mechanical, not a matter of judgement: `judge.ts` sent `question`, `reply` and
`citations` and nothing else. `grep bundesland scripts/eval/judge.ts` returned nothing. The
rubric's substitution test opens *"When the question names a state …"*, so on a question naming
none it had nothing to test and treated jurisdiction as unsupported.

**Blast radius, measured.** Replies that are state-scoped where the question is not: 7 rows in
sample 1, 6 in sample 2. In sample 1 the only two rows flagged `invented_claim` were **R-01 and
R-05 — the only two REFUSE failures.** A missing input decided a gate.

**R-01, found by chasing that mechanism.** `judge.v5.md:91-98` works through this exact Bavaria row
and states that it *"was correctly scored `invented_claim: false` on the substitution test"*. The
judge scored it true, its own `_why` showing it reach the right answer first — *"These are the
federal BEEG rules, so they are the general rule, **but** … Marking true on the strict reading."*
It also set `individual_case_verdict` because the reply quoted the €1,800 statutory cap, which the
rubric already permits.

## Decision

`JudgeInput` carries `bundesland`, emitted as `profile_bundesland` beside the category — deliberately
outside `<question>`, since the substitution test must distinguish what the user said from what
their profile says. `judge.v6` rewrites that test to key on the profile, states that answering in
the profile's own state is correct behaviour and never an invented claim, and moves the
"quoting a statutory threshold is not a verdict" rule into the `individual_case_verdict` definition
where it is applied.

## Alternatives

Put the Bundesland inside the question text — rejected: it would make the profile indistinguishable
from what the user asked, which is the confusion that caused this. Re-score the two flags by hand —
rejected: a known-faulty instrument's verdicts are not repaired one row at a time.

## Consequence

Every Phase 5 figure was measured on this instrument, so none stands; two baselines are re-bought
under `judge.v6` and golden v1.12. **The audit paid for itself on its first use** — six verdicts
read by a human found a defect that eleven committed reports had not, and it was in the component
every number depends on. The playbook has asked for this audit since Phase 5 began and it had been
skipped seven baselines running.
