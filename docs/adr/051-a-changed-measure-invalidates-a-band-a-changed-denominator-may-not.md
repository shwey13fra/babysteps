# ADR-051 — A changed measure invalidates a band; a changed denominator may not

Date: 2026-11-04 · Extends: ADR-048 · Code: `data/golden/variance-band.yaml`, `run.ts` `bandCell`

Context: ADR-048 made bands declared data, stale when a component in `depends_on` moves. ADR-049
and ADR-050 changed two gate measures without moving any configuration component: no new judge,
golden, answer prompt or corpus. `depends_on` answers "has something this band is sensitive to
moved" and cannot answer "is this still the same quantity", so both bands would have been quoted
as current while describing measures that no longer exist.

Decision: a band carries `invalidated_by` when the MEASURE changed. It outranks configuration
drift in the report, because there is no point saying a number moved by ±n units when n was
counted on a different quantity. A band may instead be RE-EXPRESSED in a new denominator, with no
new samples, only when the rows leaving it are deterministic across every existing sample — and
the evidence goes in the note, read off the committed reports rather than argued.

Applied immediately, and the two cases diverge:

- **citation_validity: invalid.** ADR-049 moves the numerator (A-17 goes 0/3 to 3/3), so
  94.2–94.6% measured something else. Needs new samples.
- **retrieval_hit: re-expressed, 23/30 → 23/28.** A-24 and A-26 were misses in iter7, variance-2
  AND variance-3, at `topCosine` 0.3992 / 0.3992 / 0.3992 and 0.4251 / 0.4252 / 0.4251. The
  numerator is untouched, so the movement of 0 hits carries over exactly: **82.1% at n=3**.

Alternative: re-measure both, 3 samples at $3.62 each. Rejected for retrieval — buying samples to
re-learn a figure that follows from three already on disk is not evidence, it is spend.

Consequence: a gate can now be met by re-expression. That is only honest where the dropped rows
are deterministic, which is why the rule names that condition and the note carries the proof.
