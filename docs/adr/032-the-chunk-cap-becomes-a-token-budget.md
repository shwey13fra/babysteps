# ADR-032 — brief §4's chunk cap becomes a token budget, and completion stops at a gap

Date: 2026-10-29 · Status: accepted

## Context

Section completion (iteration 2) fills a retrieved chunk's § out to its whole contiguous run, so
a call can carry 10–14 chunks. `babysteps-build-brief-v2-vercel-supabase.md:127` caps retrieval
context at **top-8 chunks**, and CLAUDE.md gives the brief authority on architecture.

The cap protects cost and context size. Chunks run **493–2,699 characters**, so a count of chunks
was never the quantity it was protecting — 8 chunks is anywhere from 140 to 6,200 tokens.

Separately, merging by `section_ref` alone is unsafe. Verified against the live corpus on
2026-10-29: 37 of 183 statute sections span several chunks, and **3 of those 37 are not a
contiguous id run** — `Kinder-RL §22a` (4451, 4461), `Kinder-RL §17` (4452–4454, 4465) and
`Kinder-RL §62` (4508, 4514). Chunk 4451 sits between §16 and §17 in document order while
labelled §22a, and its heading is a fragment of a sentence. Merging across such a gap would put
foreign text inside a cited §, which is the one failure this product cannot afford.

## Decision

The cap is re-expressed as **`EXCERPT_TOKEN_BUDGET = 12,800` estimated tokens** — 8 chunks at the
chunker's 800-token ceiling, doubled to leave room for completion. The ranked `TOP_K` are never
dropped to stay inside it: they are what the brief guarantees. Completion is best-effort within
what remains, and a skip is **reported** (`Completion.budgetSkipped`) rather than silent.

Completion merges only the **contiguous id run containing the anchor**. A gap means a mislabelled
`section_ref`, so completion is a deliberate no-op there and the § is named in
`Completion.nonContiguous`.

Runs are expanded **in place of their first anchor**, preserving ranked order. This is
load-bearing: `run.ts` maps chunks by `source_url` last-wins, so in-place expansion keeps the
final chunk for any URL a chunk of the same §, and citation validity cannot move for ordering
reasons.

## Alternatives

- **Append siblings and ignore the cap.** Rejected: overrides a document that wins on
  architecture, with no record.
- **Drop ranked K to 6 so ranked + siblings is about 8.** Rejected: two variables in one
  iteration.
- **Merge every chunk sharing a `section_ref`.** Rejected on measurement — it would have
  concatenated a mislabelled consent fragment into a cited `§22a`.
- **Fix the three mislabelled `section_ref`s first.** Deferred: re-parsing and re-pushing the
  Kinder-RL PDF is an ingestion job and a second variable. The contiguity rule makes it harmless
  meanwhile.

## Consequence

A § arrives whole wherever its parts were retrieved, at one extra DB round-trip and no model call.
Measured token growth on the two probe rows: **+3.4%**.

The cap is now enforced on the quantity it was protecting, but it is a **derived** number: if the
chunker's 800-token ceiling changes, this must change with it. `part`/`of` are still computed by
the chunker and dropped by `push.ts:79`, so contiguity rests on insertion order — asserted across
all 37 split sections in `tests/rag/retrieve.test.ts`, not assumed.

**This ADR records a decision whose motivating hypothesis was then falsified.** The probe showed
A-16 and A-18 already had their missing Absätze in the ranked top-8; the truncation those rows
complained of was in the *judge's* input, not the model's (see the 2026-10-29 journal). Section
completion remains correct and cheap, but its measured value is unproven, and whether it stays
depends on the run that follows the judge-context repair.
