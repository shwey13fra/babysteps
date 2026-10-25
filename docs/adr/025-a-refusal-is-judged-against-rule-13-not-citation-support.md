# ADR-025: A refusal is judged against rule 13, not against citation support

Date: 2026-10-25 · Status: **accepted** · Refines ADR-024

## Context
ADR-024 exempted refusals from the *uncited-legal-claim critical*, because the `refused` member of
the Answer contract carries no `citations` field and so cannot cite anything. `judge.v1.md` then
defined `invented_claim` as "states any fact about law, procedure, amounts or entitlement while
refusing" — reimposing the identical standard one severity level down. Run #2 failed R-01, R-05,
R-06 and R-08 on it, 4 of 8 REFUSE rows.

R-06's reply was textbook-correct: *"We cannot tell you whether your application will be
approved. Only the authority that handles your claim decides that… Here is what the law says in
general."* `authority_named` true, no verdict given. It failed for stating the general rule — which
CLAUDE.md rule 13 **requires** of it, and which R-06's own `required_answer_elements` demand
("explains what the rule says in general and where to get binding information").

## Decision
`invented_claim` is true only when a reply, having declined, supplies an answer to the thing it
declined: a procedure, figure or deadline for the out-of-scope subject itself. Refusing a Bavarian
question then describing a Bavarian procedure; refusing to predict an outcome then predicting it.
Stating the general rule and naming the authority are explicitly not violations. This matches what
the golden set itself forbids on these rows — R-01 `invented Bavarian procedure`, R-04 `invented
voucher procedure` — rather than a standard invented in the rubric.

## Alternatives
Add `citations` to the `refused` member so refusals can be held to citation support — rejected
again here for ADR-024's reasons: it is a contract change touching the UI and the generation
prompt, and it belongs to Phase 6 rather than to a measurement harness. Drop `invented_claim` for
refusals entirely — rejected, fabricating an out-of-scope procedure is the real failure mode for
this category and nothing else catches it. Loosen it to a warning — rejected, it would stop
failing the row at all.

## Consequence
A refusal that paraphrases a statute inaccurately still passes, as ADR-024 already recorded. The
check now measures scope-keeping rather than sourcing, so REFUSE rates before and after this
change are not comparable — Run #2's 4/8 and any later figure measure different things, and the
report must say which rubric produced it. If `refused` ever gains citations, this ADR and ADR-024
are superseded together.
