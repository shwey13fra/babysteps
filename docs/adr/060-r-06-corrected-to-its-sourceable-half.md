# ADR-060 — R-06's element is corrected to its sourceable half

Date: 2026-11-05 · Status: accepted · Human ruling 2026-11-05 · Follows ADR-056

## Context

R-06's second required element read *"explains what the rule says in general and where to get
binding information."* That asks the product to state what an authority is **empowered** to provide,
which `answer.v4`'s rules correctly require an excerpt for.

iter11 measured the conflict in both directions in one run: R-06 **passed** on the sentence *"it is
where you get a binding answer on your own case"*, and A-30 raised a **critical** on that same
sentence. An element cannot both require a claim and have the claim be a defect.

## Decision

Golden **v1.11**: the element becomes *"explains what the rule says in general and names where to
ask about their own case."* The duty is kept — a refusal that names a decider and stops has not told
the user they may go and ask — and only the characterisation of the answer is dropped.

Produced by one textual replacement of a unique substring: **exactly 1 of 49 lines differs.** R-06 is
a REFUSE row, so the ANSWER scorable denominator holds at **85** and REFUSE element totals hold at
16. `golden-drift.ts` reports 0 drift, identical to v1.9/v1.10.

## Alternatives

Delete the element — rejected: it would shrink a gate denominator a fourth time in Phase 5 and lose
real product behaviour. Keep it and make the prompt conditional — rejected under ADR-059.

## Consequence

Third instance of one class — A-16, A-17, now R-06 — so it is the standing rule, not a one-off: **a
required element whose wording asserts more than the corpus supports is a golden-set defect, and it
is corrected to its sourceable half rather than deleted.** R-05's remaining element is *not* in this
class: it is a proved retrieval miss and stays failing.
