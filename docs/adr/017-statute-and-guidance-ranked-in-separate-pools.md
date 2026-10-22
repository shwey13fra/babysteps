# ADR-017: Statute and guidance are ranked in separate pools

Date: 2026-10-22 · Status: **accepted**

## Context
Adding the explanatory HTML sources made the corpus 79% guidance (532 of 673 chunks).
familienportal's plain language matches a conversational question better than dense statutory
German, so statute lost every probe it had previously won. Measured on the live corpus, rank of
the correct § in a top-50:

| query | target | 141 chunks | 673 chunks | statute in top-10 |
| --- | --- | --- | --- | --- |
| Elterngeld rückwirkend | BEEG §7 | #1 | #4 | 1/10 |
| Kündigung schwanger | MuSchG §17 | #1 | #5 | 3/10 |
| parental allowance after birth (EN) | BEEG §7 | #3 | #15 | **0/10** |

Not a ranking nicety: rule 8 requires a citation on every answer and ADR-012/013 exist so legal
claims cite statute. A retriever that never returns BEEG §7 yields answers citing familienportal's
*summary of* BEEG §7 — second-hand sourcing wearing a citation's clothes. A prompt cannot cite
what retrieval never returned, so it had to be fixed in retrieval.

## Decision
`source_kind` column ('statute' | 'guidance'), backfilled from `section_ref is not null`.
`match_chunks` ranks each kind in its own pool and lets RRF fuse them, so the best statute chunk
and the best guidance chunk both enter fusion at rank 1. Signature and return shape unchanged,
so it replaces in place and no caller changes.

## Alternatives
Weight statute above guidance in the RRF score — rejected, a tuning constant to maintain, and the
playbook reserves one-variable tuning for Session 5. Keep guidance out of the answer corpus —
rejected, discards genuinely useful plain-language text. Rely on the Phase 3 prompt to prefer
statute — rejected, it cannot cite what was never retrieved.

## Consequence
7/7 gate probes pass, statute restored to #1–#3 while `U2 Untersuchung` still returns G-BA at #1:
the quota protects both directions. Each pool keeps its own index-using `order by ... limit`, so
HNSW and GIN are still used. Every retrieval measurement taken before this is void, ADR-009's
threshold included. New sources must set `source_kind`; `push.ts` derives it from `section_ref`.
