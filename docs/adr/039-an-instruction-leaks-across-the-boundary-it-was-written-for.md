# ADR-039: An instruction scoped to one boundary leaks across the others

Date: 2026-10-31 · Status: **accepted** · **Amends ADR-036 and ADR-037**, both measured in iter4

## Context
ADR-036 and ADR-037 were written and committed without measurement. The iter4 baseline
(`eval/reports/2026-10-31-iter4.md`) measured both, and each had a defect of the same shape: an
instruction aimed at one boundary was applied at another that its words also fit.

**ADR-036 → R-01.** The individual-case test says *"Can the question be answered by stating what
the law provides for everyone? Answer it."* R-01 asks about Elterngeld for a self-employed parent
in **Bavaria** — out of scope by jurisdiction. Federal law *is* provided for everyone, so the test
fired: R-01 went `refused (out_of_scope)` → `answered` and both required elements went 2 → 0. The
test decided a scope question it was never about.

**ADR-037 → A-25.** The same paragraph that says *"a route is a factual claim and obeys the citing
rules"* also instructed the model, where no excerpt gives the route, to *"say that it can give
binding information"* — itself an unsourced claim about an office's powers. It removed A-08's
critical and created A-25's, of identical class. Criticals held at 3 while the row set turned over.

## Decision
Three wordings, all in `answer.v2.md`:

1. **The individual-case test governs that boundary only and decides nothing about scope.** Stated
   explicitly, with the reason: the two boundaries are unrelated, and "the law provides this for
   everyone" must never be read as "therefore this is in scope".
2. **Name the office; do not describe its powers.** Naming who is responsible is required by rule
   13. Saying what that office may do — give binding information, rule, confirm, exempt — is a
   claim about its competence and needs an excerpt like a deadline does.
3. **Answering the covered part does not discharge the out-of-scope duties.** A reply that answers
   the federal half must still say the state is outside those this product covers and still name
   that state's authority. *"Procedures there are not covered here"* does neither.

## Alternatives
Revert ADR-036's test — would restore R-01 and give back A-25, A-27 and the coverage they bought.
Rejected: the test is right about its own boundary, and the defect was its silence about the
others. Leave A-25's critical and accept 3 — rejected; it was self-inflicted by our own wording.

## Measured, 10 rows, $0.96, one sample each
**R-01 recovered fully**: `refused (out_of_scope)`, 2/2 elements, pass. **A-25's critical is
gone.** A-08, A-27, R-05, R-06 and R-08 all held. Criticals across these rows 3 → 1.

A-03's critical also cleared and the row passes, but A-03 passed at iter3, failed at iter4 and
passes now on 4/4 elements both times — **it flaps on the critical, so this is variance, not a
fix**, and it is not claimed as one.

## Consequence
**A-06 still raises a critical, and on a third different claim each run** — now *"whether you are
entitled, is decided by the Elterngeldstelle for your district"*. This exposes a structural
conflict no prompt wording resolves: **rule 13 requires naming the authority that decides, and the
judge scores an unexcerpted authority as an uncited legal claim.** The corpus does not carry the
authority mapping for most benefits, so obeying rule 13 manufactures a critical. Three routes
exist — a derived allowlist for authority-naming on the ADR-023 pattern, ingesting the mapping, or
satisfying rule 13 generically ("the responsible authority") without naming a body. **This is a
decision for the human and is not taken here.**
