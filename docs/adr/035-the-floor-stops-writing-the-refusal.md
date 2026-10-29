# ADR-035: The floor stops writing the refusal

Date: 2026-10-29 · Status: **accepted** · Measured in `eval/reports/2026-10-29-iter3.md`

## Context
Four of eight golden REFUSE rows got a byte-identical two-sentence constant, because
`isLowConfidence` returned `refuse("low_confidence")` before `generate()` was ever called. An
out-of-scope question has a low cosine *by definition*, so the floor intercepted precisely the rows
`answer.v2.md`'s `out_of_scope` rule was written for — a rule that names tenancy, private
insurance, other consulates and childcare in other states explicitly. The constant cannot name a
subject or a referral body, so it routed landlord disputes to the Elterngeldstelle, and no prompt
edit could reach those rows. REFUSE element coverage was 6/16.

## Decision
`answerOrRefuse()` in `lib/rag/generate.ts` owns the branch, and both call sites — the route and
the eval — share it so they cannot drift. Below the floor the model writes the refusal; the row
still refuses, because anything that is not a refusal is discarded for the constant. Zero
retrieval short-circuits before the model: with no excerpts `generate()` fails its contract twice
and returns `unavailable`, which would file an empty corpus result as an outage (ADR-022).

## Alternatives
A lexical subject → referral table: deterministic and free, rejected because a table built from
eight golden rows passes the eval and fails a real user. Extending `guard.v1.md` to classify scope:
rejected, it would give the medical classifier a second job and put the only 10/10 gate at risk.
Raising the threshold so these rows answer: rejected, it is a floor against answering from nothing.

## Consequence
REFUSE **1/8 → 6/8**, element coverage **6/16 → 14/16**. R-03 and R-07 pass outright; R-02 and
R-04 now name their subject and a body but miss the second conjunct of a compound element ("the
insurer **and** the official channels", "the **city portal**"). A-24 and A-26 stayed refused, as
intended — the net is doing its job, and their fix is ingestion. Six extra answer calls cost
$2.68 → $3.07. The refusal path now awaits a model call, which the Phase 6 UI must show as a
pending state. Latency on a refusal is no longer near-zero.
