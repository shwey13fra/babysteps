# Phase 5 exit — what the answer layer measures, and what it misses

BabySteps Germany · 2026-11-05 · git `e223aeb` · answer **v5** · judge **v5** · golden **v1.11**
Corpus `2026-10`, 783 chunks · evidence: `eval/reports/2026-11-05-phase5-n2-combined.md`

> **One field is open.** The judge has not yet been audited by a human. Six verdicts are prepared
> in `eval/reports/2026-11-05-judge-audit-pack.md`. Every figure below rests on that instrument, so
> this document is final only once the audit is recorded here. Disagreement on 2 of 6 invalidates
> the figures; agreement on 5 or 6 confirms them.
>
> **Audit result: _pending_.**

---

## What Phase 5 was for

Phase 5 built and tuned the retrieval-and-answer layer: given a parent's question, find the
official German provision, and answer only from it, with citations. It ends on six numeric gates
set on 2026-11-03, before any of the results below existed.

**Four are met. Two are missed.** Both misses are inside measurement noise rather than defects with
a fix, and this document says so plainly rather than iterating until a noisy number lands.

## The gates

Measured on **two full baselines** bought back-to-back at one commit with nothing changed between
them. Each gate is assessed on the **lower bound** across the samples, never the mean: a single
sample with no *n* is not a result.

| gate | bar | sample 1 | sample 2 | lower bound | n | band | |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Retrieval hit, scorable | ≥80% | 23/28 (82.1%) | 23/28 (82.1%) | **82.1%** | 2 | 0 hits | **met** |
| Citation validity | ≥95% | 59/59 (100%) | 62/62 (100%) | **100%** | 2 | 0 | **met** |
| Required elements, scorable | ≥75% | 66/85 (77.6%) | 62/85 (72.9%) | **72.9%** | 2 | ±4 net, 6 gross | **missed** |
| DEFLECT (medical redirect) | 10/10 | 10/10 | 10/10 | **10/10** | 2 | 0 | **met** |
| REFUSE (scope and individual case) | ≥7/8 | 6/8 | 8/8 | **6/8** | 2 | ±2 rows | **missed** |
| Criticals, adjudicated | 0 | 0 | 0 | **0** | 2 | 0 | **met** |

Both denominators, throughout:

| measure | scorable (the gate figure) | all rows / all elements |
| --- | --- | --- |
| Retrieval hit | 23/28 — 82.1% | 23/30 — 76.7% |
| Required elements | 66/85 and 62/85 | 66/93 and 62/93 — 71.0% and 66.7% |

The scorable denominator excludes rows and elements for which **no ingestable source exists** —
eight elements across A-24 and A-26, all consular. These are declared data in
`data/golden/coverage-exclusions.yaml`, validated before every run, and justified structurally: a
retrieval failure is never grounds for an entry.

## The two misses, stated plainly

### Required-element coverage: missed by **2 elements of 85** (1.2 points)

Bar 64/85. Samples **62** and **66**. The bar sits *between* them.

Between two runs with every input identical, **6 elements moved across 6 rows**, net −4:

| | |
| --- | --- |
| gained | A-17 tolerance limits begin at U2 |
| lost | A-01 date computed from the due date · A-06 `EStG §2(5)` · A-07 14 months when one parent's income is reduced · A-21 the six Hessian offices named · A-23 online availability depends on the Bundesland |

Nothing caused this. No input changed. The gate's margin (2 elements) is smaller than the
measurement's own movement (4–6), so **which side of the bar a run lands on is not determined by
the product.**

### REFUSE: missed by **1 row of 8**

Bar 7/8. Samples **6/8** and **8/8** — again straddling. Across all seven samples ever taken the
raw count is **7, 7, 8, 7, 6, 6, 8**, and **five distinct rows have failed, none of them twice at
the same commit.**

That pattern is the finding. A gate whose failing row changes every run has no stable floor to
measure.

### Why further iteration would not honestly close either

- **Neither miss names a defect.** There is no failing behaviour to fix that these numbers
  identify. The rows that failed in one sample passed in the other.
- **Sampling cannot help, by construction.** The gates are assessed on a lower bound, which is a
  minimum across samples — each additional sample can only hold it or push it down. Spending to
  raise it is arithmetically impossible.
- **Tuning against the gap would be fitting to noise.** With movement of 4–6 elements and a 2-element
  margin, any change could be declared a success or a regression by choosing a sample.
- **Moving the bars was considered and refused.** A threshold set before the run is evidence;
  a threshold moved after seeing the result is decoration. Nothing learned after 2026-11-03
  justifies moving one.

## The real finding: the instrument, not the product

Phase 5's defect count is lopsided, and this is the most useful thing it produced.

| where the defect was | count | examples |
| --- | --- | --- |
| **Measurement instrument** | **11** | judge rubric ×3 (ADR-046, 047, 026), golden-set specification ×4 (ADR-053, 056, 060, and the v1.1–v1.10 CSV truncation), budget gate ×2 (ADR-061), golden loader ×1 (ADR-061), version labelling ×1 (ADR-064) |
| **Variance accounting** | **3** | gates read to a precision they did not contain (ADR-048), denominators conflated (ADR-050, 051), band components untracked (glossary) |
| **Answer layer (the product)** | **3** | a prompt contradicting itself (ADR-057), completeness unbounded by register (ADR-057), a German term defined from memory (ADR-058) |

**Roughly four instrument or accounting defects for every product defect.** Two of the instrument
defects were gates that *failed open* — a budget check that printed "coverage NOT checked" and
started the run anyway, and a CSV loader that silently truncated ground truth for ten golden
versions. Neither had ever produced a visibly wrong number. That is what makes them the dangerous
class: **a gate that fails open is worse than no gate, because it is trusted.**

One of them had been **tested in**: an existing unit test asserted *"does not block when no
comparable baseline exists"*. The defect was not an oversight; it was specified.

### Two claims of ours were falsified, and by what

**1. "R-05's element is unreachable; REFUSE is structurally pinned at 7/8."** Asserted twice, with a
probe as evidence. The probe correctly reported that one chunk — the Familienportal section headed
*"Wo kann ich den Antrag stellen?"* — sits outside R-05's ranked top-8. The error was treating the
one chunk named by a regex we had written ourselves as the *only* route to the element. In sample 2
the model satisfied it from a different chunk, citing the Familienportal's official how-to-apply
page, and REFUSE came in at **8/8**.

The sharpest part, and the most honest sentence in this phase: **we argued that a second sample
could not help, and the second sample proved us wrong.** The argument was valid — a lower bound
cannot be raised by sampling — and rested on a false premise, which is how a sound principle
produces a confident wrong answer. The sample was bought over that argument, by instruction.

**2. "REFUSE newly failed under answer.v3."** A regression was reported from one sample against
another. Read on disk, the two samples failed *different* rows and the supposedly broken rows had
passed under the same prompt. There was no regression. This is what sent Phase 5 to read the prompt
instead of buying $8.20 of baselines — the single most valuable correction of the phase, and it
cost nothing.

### Precision: four of five gate metrics were over-read

Until 2026-11-03 these figures were quoted to a tenth of a point from single samples. Measuring the
run-to-run movement with every input fixed showed how much of that precision was real:

| metric | movement with nothing changed | previously quoted as |
| --- | --- | --- |
| Required elements | **4–6 elements** | ±2 |
| REFUSE rows | **2 rows of 8** | a single figure |
| Criticals | 0–1 | an exact count |
| Citation validity | 0 (100% four samples running) | a single figure |
| Retrieval hit | **0** — identical across all seven samples | a single figure |

Only **retrieval hit** was ever trustworthy to the unit, because no model judgement enters it: it is
embedding similarity against a fixed corpus. Every other gate carried noise that the reporting
format hid. The fix is now structural — `run.ts` refuses to print a gate figure without its sample
size and band beside it.

## What is genuinely good

- **Citation validity is 100% on four consecutive samples** across three different answer prompts.
  Of every § a reply claimed, every one resolved to a chunk actually retrieved and shown. This is
  the product's core promise — that each sentence traces to an official source — and it is the
  gate that is met at its ceiling.
- **Zero criticals on both samples**, the first clean pair in the phase. Both causes measured this
  week were *removed* rather than re-rolled: a definition supplied from memory, and a phrase
  asserting an authority's powers. A zero bar on a stochastic measure is only ever met that way.
- **Medical deflection is 10/10 in the last ten consecutive baselines**, and in 15 of the 18 full
  baselines ever run. The three misses (9/10) were all before 2026-10-31 and predate the judge and
  golden-set corrections. Clinical questions are redirected to a clinician without exception in
  every sample since — the safety boundary that matters most to a pregnant user, and the only gate
  with a perfect recent record that is *not* at the ceiling by construction.
- **Retrieval is stable to the unit** at 82.1%, identical across seven samples and three
  configurations.

## What would actually close the gaps

Known work, scoped, none of it a repair of something broken:

1. **Corpus coverage for the structurally unreachable elements (~5).** Facts that are true, useful
   and in no ingested source: contribution-freedom of family insurance (SGB V §3 and §223 are not
   ingested), the fee position of the Sorgeerklärung, the definition of a *Lebensmonat*, and
   India's position on dual citizenship. Each returns **0 chunks** corpus-wide. These are ingestion
   decisions, not tuning. Closing them lifts the coverage ceiling from ~94% toward the bar with
   room.
2. **Consular curation (8 elements, A-24 and A-26).** Already excluded and already scheduled
   pre-beta. The Indian mission sources are robots-restricted or unstable, so this is hand-curation
   with a review date, per ADR-019. Until then the product cannot answer the two consular questions
   it is asked most.
3. **A judge with a stable refusal test.** The REFUSE gate's instability is at least partly the
   instrument: judge v5 already fixed one false-negative on `refusal_present`, and five distinct
   rows failing once each is the signature of a rubric that reads borderline refusals differently
   run to run. A refusal test that is deterministic — or scored on a rubric with its own agreement
   measure — would tell us whether the remaining REFUSE gap is product or instrument. **Today we
   cannot distinguish them, and this document does not claim to.**
4. **Retrieval for the shown-but-unused elements (~13).** The largest movable pool, and verifiable
   for $0 before any model call using `probe-element-reach` and `probe-corpus-diff`. Note the
   caveat earned above: a probe's miss is a fact about its chunk, not about the element.

## The decision

**Phase 5 ships with two documented misses**, at a coverage lower bound of **72.9%** against 75%
and a REFUSE lower bound of **6/8** against 7/8, both inside measured noise, with the reasoning
above and the evidence committed — including the failing runs.

The alternative was to buy samples until a noisy number landed on the right side of a line. That
would have produced a green dashboard and a worse product, and it would have discarded the one
thing this phase actually earned: **numbers that are known to be true, with their uncertainty
stated.**

Phase 6 begins with the UI. `app/intake`, `app/timeline` and `app/item/[id]` are stubs; `/api/ics`
and `/api/timeline` return 501.
