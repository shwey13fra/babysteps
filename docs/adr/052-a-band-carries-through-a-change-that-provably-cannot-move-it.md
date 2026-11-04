# ADR-052 — A band carries through a change that provably cannot move it

Date: 2026-11-04 · Extends: ADR-048, ADR-051 · Code: `run.ts` `bandStale`, `validateVariance`

Context: golden v1.8 → v1.9 removed two ANSWER required elements. Every band `depends_on: golden`,
so all five would have printed **stale** — including `retrieval_hit`, the one gate currently
passing at n=3 with a band of 0. For retrieval that warning is **known to be false**:
`retrievalHit` is computed from `ground_truth_source` and `ground_truth_url`, and the cell-by-cell
migration shows exactly two differences, both in `required_answer_elements`, on rows that are not
excluded. The human ruled on 2026-11-04 that a known-false warning must not print, because false
warnings get ignored and then a true one gets ignored too.

Decision: a band may be **re-scoped** to a component's new value with `rescoped_to` plus
`rescoped_why` carrying the proof. `bandStale` compares the re-scoped value against the **live**
one, so a band re-scoped to `golden: v1.9` goes stale again at v2.0 — one proof cannot excuse
every future change. `validateVariance` throws, before the first model call, if `rescoped_to`
names a component absent from `depends_on`, or if either of the pair is set without the other.

This is the other half of the band file's rule 2 ("list a component unless the band provably
cannot move with it"): conservative by default, with a declared, proof-carrying exception for the
one change where the proof exists.

Applied: `retrieval_hit` re-scoped to v1.9 and reads current. `coverage_scorable` is **not**
re-scoped — it is re-expressed 87 → 85 per ADR-051 (both removed elements measured uncovered in
all three samples, checked on disk) and stays **stale on `judge`**, which judge.v5 invalidated and
nobody has re-measured.

Alternative: suppress staleness for golden changes that touch no ground-truth cell, computed
automatically. Rejected — it infers a proof the tool cannot actually check, and the next
golden change would inherit it silently. A re-scope is declared data, like the bands themselves.

Consequence: staleness is now a per-band claim with per-band evidence, not a global diff. The risk
is a wrong proof in `rescoped_why`, which no validator can catch — so a re-scope is a human-visible
line in a committed file, and its reasoning belongs in the changelog that caused it.
