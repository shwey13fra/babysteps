# ADR-041: Naming the deciding authority is not an uncited legal claim

Date: 2026-11-02 · Status: **accepted** · Closes the gap ADR-033 filed · Rubric `judge.v3.md`

## Context
All four iter5 criticals (A-06, A-16, A-18, A-29) quote the reply's closing rule-13 sentence.
`judge.v2.md` exempts authority-naming from `invented_claim` (:73) and `individual_case_verdict`
(:131) and rewards it via `authority_named` (:134), but never from `uncited_legal_claim` — the gap
ADR-033 predicted. A-29's `_why` concedes the name is in the excerpts, so what is unsourced is the
body's *competence*, not its identity: no authority mapping would fix this. The counter-pressure is
measured — A-27 lost a required element for saying "local immigration authority" instead of
"Ausländerbehörde", so the coverage gate penalises the generic phrasing the criticals gate rewards.

## Decision
`judge.v3.md` exempts a sentence whose only unsupported content is which body decides or is to be
contacted. A substantive requirement attached to it — deadline, form, document, amount,
precondition, order of steps — is still judged normally. New version file, not an edit to v2:
every past report records `judge.v2.md` and that label must keep identifying one rubric (ADR-029).

## Alternatives
Narrow it to decision-attribution only — rejected, A-18 is a contact route, so criticals would
stay at 1 and still fail a gate of 0. Phrase answers generically — rejected, A-27 measures the
coverage cost. Ingest an authority mapping — rejected, it does not address competence.

## Consequence
The judge can no longer catch a **wrongly named** authority, and nothing else in the harness
checks authority correctness. Accepted hole, and the reason to build the mapping.
Separately, A-29 says "decided **only** by" — an exclusivity claim ADR-033 read as omitting the
Finanzamt's role. `answer.v2.md:175` mandates that "only", so the judge is the wrong place to
correct it; it is a product-prompt question, left open deliberately to keep one variable per step.
