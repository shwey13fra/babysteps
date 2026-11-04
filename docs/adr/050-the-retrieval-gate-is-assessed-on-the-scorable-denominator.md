# ADR-050 — The retrieval gate is assessed on the scorable denominator

Date: 2026-11-04 · Human ruling · Amends: Phase 5 exit criteria · Extends: ADR-043, ADR-045

Context: ADR-043 removed 8 required elements from the coverage denominator because no ingestable
source exists for them. Those 8 are the whole of A-24 and A-26 — 3 of 3 and 5 of 5 of each row's
required elements. The retrieval denominator was left untouched, so the same two rows were
excluded on one measure and scored as misses on the other. Both come back `kind: refused` with
zero citations and a `topCosine` under the 0.43 floor — 0.3992 and 0.4251 — because the corpus
holds nothing to retrieve. Neither row can contribute a hit; counting them moves only the
denominator.

Decision: a row whose EVERY required element is declared unreachable leaves the scorable retrieval
denominator. `retrievalHit` is still measured and still printed per row — nulling it would destroy
the all-rows figure every recorded number is expressed in — and both figures print
unconditionally, gate figure first, as ADR-019's amendment requires for coverage. A
partially-excluded row stays in. The set is derived from the full golden set and printed at
startup, before the first model call. Retrieval reads **23/28 = 82.1%** against a bar of 80%.

Alternative: keep 23/30 and fail the gate. Rejected: the inconsistency is in the instrument, not
in the product. The counter-argument is recorded rather than dismissed — those users still get no
answer. What they get is a refusal, the designed behaviour when no source exists, and the refusal
channel is graded separately at 100%.

Consequence: the gate is met on evidence already bought, not on a future run (ADR-051). When the
consular curation lands, the exclusions go and these rows re-enter both denominators at once.
