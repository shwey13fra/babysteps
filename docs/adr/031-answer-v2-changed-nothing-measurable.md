# ADR-031 — answer.v2 changed nothing measurable; the cluster is not a prompt problem

Date: 2026-10-28 · Status: accepted

## Context

`answer.v2.md` added exactly two rules to attack the `uncited_legal_claim` cluster (15 of 16
criticals at run3): the **conflict rule** (the excerpt governs when it and your own knowledge
disagree) and the **omission rule** (a step no excerpt contains is omitted, not hedged — naming
"generally", "normally", "usually", "in most cases", "typically").

Run `eval/reports/2026-10-28-iter1.md`, 48/48 rows measured, $2.61:

| measure | prediction | result | reading |
| --- | --- | --- | --- |
| criticals | ≤5 | **13** | inside the measured noise band 12/13/15/18 |
| retrieval hit | unchanged exactly | **24/30** | control held — run is not contaminated |
| citation validity | ±2pp | 94.7% | as predicted |
| coverage | 50–58% | 54.7% (52/95) | as predicted |

Per ADR-030 the comparison is **sets of row ids**: **12 of the baseline 17 are still critical**,
the 4/4 hard core is **5/6** intact (A-28 cleared), A-04/A-09/A-13/A-19 cleared, and A-27 entered
— A-27 only began answering at all when ADR-009 was re-measured, so it is not attributable here.

Both added rules are observably not followed: "normally" survives in A-04, A-05, A-16, A-18 and
"usually" in A-06; A-07 still states "in consecutive months from the 15th month onward", the exact
contradiction of its own BEEG §4 excerpt that the conflict rule was written for.

## Decision

Iteration 1 is recorded as **no measured effect**. `answer.v2.md` stays in place — it caused no
measured harm and three reports now cite it — but no causal claim is attached to it. No confirming
runs are bought. **Iteration 2's single variable is chunk sizing**, not prose.

## Alternatives

- **Buy 2 confirming runs ($4.90).** Rejected: 13 sits inside the band and the row set is
  unchanged. More samples would sharpen a number that already says "no effect".
- **Revert to answer.v1.** Rejected: no measured harm, and a revert is a second variable.
- **Strengthen the prompt wording again.** Rejected: the named hedge words are still emitted, so
  instruction-following at word level is not the binding constraint. ADR's plan §2 already refused
  "say it louder" once; this run is the evidence it was right.

## Consequence

Prompt engineering is exhausted as a lever for this cluster, which closes the cheapest option.
**6 of the 13 critical reasons name a truncated or absent excerpt** (A-05, A-08, A-11, A-16, A-17,
A-18) — the model pads precisely where the excerpt is cut off, which is the chunking hypothesis
with the judge's own reasons as evidence. Iteration 2 therefore re-embeds the corpus against an
OpenAI key that expires **≈ 2026-11-21**, and voids this noise floor (~$7.40 to re-buy).
`criticals = 0` is not reachable by prompt work.
