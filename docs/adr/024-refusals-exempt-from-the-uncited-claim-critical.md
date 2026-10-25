# ADR-024: A refusal is exempt from the uncited-legal-claim critical

Date: 2026-10-25 · Status: **accepted**

## Context
Phase 4 makes "an uncited legal claim" a critical that fails the whole run. The `refused` member
of the Answer contract has no `citations` field, so a refusal is structurally incapable of
carrying one. R-06 ("will our application be approved?") is required by CLAUDE.md rule 13 and
legal pack §3 to state the rule and name the deciding authority before declining the verdict —
which means a correct R-06 response states legal conditions it cannot cite. Scored literally,
the behaviour the Phase 3 gate certified would fail the baseline on a contract artefact.

## Decision
The judge applies the uncited-legal-claim critical to `kind: "answered"` only. On a refusal it
checks instead that the response names a deciding authority and asserts no entitlement, amount
or outcome — the rule-13 invariants, which is what the critical exists to protect.

## Alternatives
Add `citations` to the `refused` member — rejected for now: it is a contract change that touches
the UI and the generation prompt, and it widens Phase 4's scope from measurement to redesign.
Drop the critical to a warning on refusals — rejected, it weakens the one check that stands
between a refusal and an unsourced legal statement. Rewrite R-06's ground truth so it quotes no
conditions — rejected, that trains the product toward a bare "we cannot say", which is the dead
end the refusal copy was written to avoid.

## Consequence
Refusals are measured against rule 13 rather than against citation validity, so a refusal that
paraphrases a statute inaccurately will pass Phase 4. That is a known blind spot and the reason
to revisit the contract in Phase 6: if `refused` gains a `citations` field, this ADR is
superseded and the critical applies uniformly.
