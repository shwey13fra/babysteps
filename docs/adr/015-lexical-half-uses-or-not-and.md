# ADR-015: The lexical half ORs its terms; AND made it return nothing

Date: 2026-10-22 · Status: **accepted**

## Context
`0002` built its tsquery with `websearch_to_tsquery('german', query_text)`, which joins
whitespace-separated terms with AND. `lib/rag/expand.ts` appends every `expand_with` term from
the glossary, so the conjunction became unsatisfiable. Measured on the live 141-chunk corpus,
2026-10-22 — rows returned with a non-null `fts_pos`:

| query_text | fts rows |
| --- | --- |
| `Elterngeld` | 8 |
| `Elterngeld rückwirkend` | 1 (BEEG §7 at fts rank 1) |
| `… Elterngeld Basiselterngeld ElterngeldPlus Bezugszeitraum` (what expand.ts sends) | **0** |

RRF was fusing a working vector retriever with a dead one — hybrid retrieval in name only. The
AND also failed on unexpanded multi-word German (`Kündigung schwanger` → 0 rows), so expansion
was not the whole cause.

## Decision
`or_tsquery(text)`: keep `websearch_to_tsquery` for stemming, normalisation and escaping, then
rewrite its top-level `&` as `|`. Phrase (`<->`) and negation (`!`) operators survive untouched.
`ts_rank` orders the disjunction, which is what RRF expects to consume.

## Alternatives
Stop appending terms in `expand.ts` — rejected, abandons the English→German lexical bridge and
leaves plain German multi-word queries broken. Build the tsquery term-by-term in TypeScript —
rejected, reimplements German stemming and escaping outside Postgres.

## Consequence
Measured before → after on the gate probes: `Elterngeld rückwirkend` MISS → **#1**; the English
probe #6 → **#3**; four further English probes all **#1**; 7/7 pass. Every retrieval number taken
before this migration is void, including anything ADR-009's refusal threshold would have been
calibrated on — the cosine distribution is unchanged but the fused ranking is not.
