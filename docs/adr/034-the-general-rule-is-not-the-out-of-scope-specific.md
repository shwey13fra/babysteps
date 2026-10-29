# ADR-034: The general rule is not the out-of-scope specific

Date: 2026-10-29 · Status: **accepted** · Refines ADR-025

## Context
ADR-025 narrowed `invented_claim` to "an answer to the thing it declined — a procedure, figure or
deadline for the out-of-scope subject itself", and added "stating the general rule is NOT an
invented claim". The judgefix run shows the judge still cannot apply that line. It failed **R-01**
for giving cited federal BEEG rules after declining Bavaria, and **R-05** for citing BEEG §7 after
declining to fill in a form.

Both goldens permit exactly what was punished. R-01: *"may: answers the federal part, only if
cited"*. R-05's `must_not` is only *"a completed form; field-by-field dictation of entries"*. So
2 of 8 REFUSE rows cannot pass the harness however the product behaves, and the 7/8 gate is
unreachable. The defect is that "the very thing it declined" names no test the judge can apply.

## Decision
Two tests are added to `judge.v2.md`, and nothing else in the rubric changes.
**(1) Substitution.** If the statement would read the same had the user named a different state,
it is the general rule — only what is true of the named state *in particular* is the invented
claim. **(2) Act, not subject.** Declining to *do* something — fill a form, compute an amount,
predict an outcome — puts the act out of scope, not the law about it.

## Alternatives
Leave it and accept REFUSE ≤ 6/8 — rejected, it writes off a gate for a measurement defect.
Delete `invented_claim` for refusals — rejected for ADR-025's reason: nothing else catches a
fabricated out-of-scope procedure. Edit the two goldens to forbid what the judge punishes —
rejected, it would change the product's spec to suit the ruler.

## Consequence
The fourth instrument change in four iterations, and the judge prompt is shared by all 48 rows:
figures from this run are **not comparable to judgefix** on any judge-derived measure. Retrieval
hit (24/30) is the control, since it is computed without the judge. The counter-risk is real — a
reply that smuggles a state-specific procedure in behind a federal framing now has a defence — so
the substitution test is written to turn on the statement, not on the framing around it.
