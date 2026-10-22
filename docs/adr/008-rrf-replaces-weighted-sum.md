# ADR-008: Reciprocal rank fusion replaces the weighted-sum hybrid

Date: 2026-10-22 · Status: **accepted**

## Context
Brief §3 scored hybrid retrieval as `0.65 * cosine + 0.35 * ts_rank`. The two terms are on
different scales: cosine lands near 0.3–0.9 for real matches, `ts_rank` is unnormalised and
returns roughly 0.02–0.30. The lexical half therefore contributed a few percent of the final
score whatever weight it was given, and the 0.55 refusal threshold was applied to a composite
whose meaning shifted per query.

## Decision
Fuse by rank, not by value: `0002_match_chunks_rrf.sql`, RRF with `rrf_k = 60`, candidate pool
50 per retriever. It returns `cosine`, `fts_rank`, `vec_pos`, `fts_pos` and `rrf` separately.

## Alternatives
Normalise ts_rank then keep the weighted sum — rejected, the normaliser needs per-corpus tuning.
Re-weight to 0.5/0.5 — rejected, does not fix a scale mismatch. Vector-only — rejected, loses
exact § matches.

## Consequence
RRF is scale-free, so no weight tuning (do not touch `rrf_k` before Run #3). Threshold refusal on
`cosine`, never on `rrf` — ADR-007 measured the floor at 0.436. `vec_pos`/`fts_pos` let the eval
attribute a miss to the vector or lexical half. 0001 must be applied before 0002.
