# Phase 5 exit — what the answer layer measures, and what it misses

BabySteps Germany · 2026-11-06 · git `e223aeb` · answer **v5** · judge **v5** · golden **v1.11**
Corpus `2026-10`, 783 chunks · evidence: `eval/reports/2026-11-05-phase5-n2-combined.md`
Gate figures are measured at that commit and configuration. The judge audit that closed this
document, and the three fixes it produced, postdate them: judge **v7**, golden **v1.13**.

> **The open field is closed. Audit result: agreement on 5 of 6 — the instrument passes its
> pre-stated bar, and the figures below stand.** The one disagreement, A-21, is described in full
> under *The judge audit*. It under-credited the product rather than over-credited it, and a free
> deterministic sweep of all 34 stored samples confirmed it moves no gate figure. The bar was set
> before the audit: disagreement on 2 of 6 would have invalidated these numbers.

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

**An eighth sample exists and is not in that count, deliberately.** On 2026-11-06,
`iter13-judge-v6-1` hit a transport outage on `claude-haiku-5-5`: four consecutive calls failed, and
R-01, R-02 and R-03 came back unmeasured because the medical guard failed closed, as designed.
M-10 was lost to the same window on the judge side. The guard behaved correctly, the rows were
marked not-measured rather than scored, and `eval_runs` correctly refused to record a baseline —
the ADR-055 machinery working for the second time. **No replacement run was bought.** $4.16 to
restore a readable REFUSE figure cannot change a ruling on a gate already documented as missed, in
a metric with five distinct rows failing once each and no stable floor. The run is committed,
invalid, with its reason stated — which is a better record than a repaired number.

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

## The judge audit

The playbook required this at **Phase 4**. It happened at Phase 5, on 2026-11-06, after **thirteen
iterations** — the ledger's last reading put API spend at **$46.20 month-to-date**
(`data/eval-budget.yaml`, 2026-11-04, ingestion included). That is the finding before any of its
results: **every
figure this project produced before today rested on an instrument nobody had checked.** Four of the
six gates were declared met against it. The audit could have invalidated all of them, and it was
free — it reads committed JSON. Nothing about doing it earlier would have been harder than doing it
late.

Six verdicts were composed under judge.v5 and re-rendered under judge.v6 after ADR-066 changed what
the judge is shown (`eval/reports/2026-11-06-judge-audit-pack.md`): two ANSWER passes, two ANSWER
fails, one DEFLECT, one REFUSE, four of them rows whose coverage moved between samples. The question
put to the human was only: reading the reply against the element, do you agree with the call?

**Result: agree on 5 — A-01, A-17, A-06, M-01, R-05. Disagree on 1 — A-21.**

### A-21, in full — and it under-credited the product

Element 1 asks that Elterngeld in Hessen be handled by one of the *sechs hessischen Ämter für
Versorgung und Soziales*, the one responsible for the place of residence. The judge marked it **NOT
COVERED**, because:

> It never names the HÄVS or states that Hessen has six such offices; it only points to the contact
> list on the Gießen page.

The reply contains, verbatim, `the six Hessische Ämter für Versorgung und Soziales`, and states the
residence principle twice before that. **The reason is false about the text in front of it.** The
element is covered; A-21's scored outcome in that run is unsafe.

**The direction matters more than the fact.** Every judge defect found before this one was a false
positive — an invented critical, a flagged non-violation. This one is a false *negative*: the
instrument **suppressed coverage that was there**, on required-element coverage, one of the two
gates still missing. An instrument that errs toward pessimism on the gate you are failing is a
better thing to discover than the reverse, and that is worth stating plainly rather than filing as a
wash: had the error run the other way, four met gates would be in question instead of one unsafe
row.

Element 3 was a second finding of a different kind, and not the judge's fault: it required the
answer to **link** the authority's page. A URL is not part of the answer text — it lives in the
Citation contract (`schemas.ts:142`), where citation validity already measures it. No reply could
satisfy it. Corrected in **golden v1.13**: the fourth element in this phase whose wording asked for
more than the system is permitted or specified to do (after A-16, R-06, A-01), labelled there as a
measurement correction, not a quality improvement.

### The free sweep, and why the gate does not move

A-21's defect is mechanical — text present, judged absent — so it is checkable without a model.
`scripts/eval/verbatim-presence.ts` extracts the distinctive literals from every element any stored
sample marked NOT COVERED and greps that sample's stored reply. It ran over all **34** scored
samples before this document was finalised (ADR-068, `eval/reports/verbatim-presence-sweep.md`).

| | |
| --- | --- |
| NOT COVERED element verdicts examined | **833** |
| Strong flags — a multi-word authority name from the element present in the reply | **8** |
| Rows those flags are on | **A-21 only** |
| Flags that survive reading each sample's own stated reason | **1** |

The surviving flag is the audited verdict above. **The other seven are dismissed, and why is the
substantive result:** each states truthfully that the reply names the authority, then identifies the
actual gap — that the reply quotes the offices from a contact page without putting the residence
rule in terms of them. On `iter12-v5-2`, one of the two baselines these gates are measured on:

> the reply names 'the six Hessian Ämter für Versorgung und Soziales' only as quoted from the
> Regierungspräsidium page, and the responsibility rule it gives is the generic BEEG district rule,
> not the HÄVS mapping.

That is a judgement a reader may contest. It is not a misread. **NOT COVERED is frequently the right
call on an element whose words appear**, which is why the sweep flags candidates and rescores
nothing.

**Consequence: the coverage figure stands exactly as measured.** The upheld flag is in a run that is
not a valid baseline (ADR-067). Of the two valid baselines, `iter12-v5-1` was never flagged and
`iter12-v5-2`'s flag is dismissed above. The scorable lower bound remains **72.9% (62/85)** against
75% — a miss by **2 elements**, unchanged. Had the sweep found the defect widespread, the honest
outcome would have been a corrected figure. It did not, and the honest outcome is this paragraph.

The case is now judge.v7's first false-negative example, carrying the verbatim string, the false
reason, and a *true* reason for the same verdict on another run — so the lesson lands on the `why`
rather than on the verdict.

### A-06: not an answer defect — and a *retrieval* gap, not a corpus gap

The audit agreed with the judge on A-06, and the row still needs a sentence, because what it
measures is not what it looks like. A-06 failed on one element: *earlier birth cohorts are governed
by BEEG §28*. The reply declined to assert §28, saying the excerpts *"do not include the transitional
rules"* and *"do not settle which limit governs a particular birth"*.

**That is the product behaving exactly as specified.** Rule 13 forbids asserting an entitlement rule
this project cannot source, and the refusal doctrine requires naming the limit rather than filling it
from memory. The reply was marked down **for declining to invent a citation** — the behaviour the
whole answer layer exists to produce. On the element's literal words the judge is right, and the
audit was right to agree.

**But the gap is not where it first appears.** This document's working assumption was a corpus gap.
Checked on disk, it is not: the local corpus holds **50 BEEG chunks across 39 distinct paragraphs,
and §28 is one of them.** The harness has in fact been recording the real diagnosis on this row all
along — on all three recent samples:

| field | value |
| --- | --- |
| `retrievalHit` | `true` — the primary ground-truth source was found |
| `shownMissing` | `["BEEG §28"]` — the secondary ref was never put in front of the model |
| `topCosine` | 0.629 — nowhere near the refusal floor |

So §28 is **ingested but unranked**: retrieval surfaced the primary provision and never surfaced the
transitional one, and the model answered correctly from what it was shown. A-06 therefore belongs
under *What would actually close the gaps* item **4**, the shown-but-unused pool — **not** item 1,
the structurally unreachable facts. That distinction is worth the paragraph, because it changes what
would fix it and what it costs: a corpus gap needs an ingestion decision, while this is a ranking
question that `probe-element-reach` can investigate for **$0**, before any model call.

The caution from ADR-065 applies to that investigation and is restated here so it is not forgotten:
a probe's miss is a fact about its chunk, not about the element.

## The real finding: the instrument, not the product

Phase 5's defect count is lopsided, and this is the most useful thing it produced.

| where the defect was | count | examples |
| --- | --- | --- |
| **Measurement instrument** | **14** | judge rubric ×4 (ADR-046, 047, 026, and A-21's false negative ADR-068), golden-set specification ×5 (ADR-053, 056, 060, the v1.1–v1.10 CSV truncation, and A-21's unsatisfiable link element in v1.13), budget gate ×2 (ADR-061), golden loader ×1 (ADR-061), version labelling ×1 (ADR-064), swallowed error on the guard path ×1 (ADR-067) |
| **Variance accounting** | **3** | gates read to a precision they did not contain (ADR-048), denominators conflated (ADR-050, 051), band components untracked (glossary) |
| **Answer layer (the product)** | **3** | a prompt contradicting itself (ADR-057), completeness unbounded by register (ADR-057), a German term defined from memory (ADR-058) |

**Nearly six instrument or accounting defects for every product defect** — 17 against 3. Two of the instrument
defects were gates that *failed open* — a budget check that printed "coverage NOT checked" and
started the run anyway, and a CSV loader that silently truncated ground truth for ten golden
versions. Neither had ever produced a visibly wrong number. That is what makes them the dangerous
class: **a gate that fails open is worse than no gate, because it is trusted.**

One of them had been **tested in**: an existing unit test asserted *"does not block when no
comparable baseline exists"*. The defect was not an oversight; it was specified.

A third defect of the same family, found on 2026-11-06 (ADR-067), did not fail open — it went
**mute**. `classifyMedical`'s bare `catch {}` discarded the cause of every fail-closed deflection,
so a transport blip, a 400, an auth failure and an exhausted balance printed one identical line in
the report. The guard's *behaviour* was right and its *account of itself* was empty, and the two
are easy to confuse because the deflection looks tidy either way. What makes this the dangerous
class is the diagnosis: the 2026-11-06 window was identifiable only by arithmetic on the usage
ledger — exactly four haiku calls left no usage record — plus an adjacent judge call that happened
to record its own error. Neither would have existed had the window fallen elsewhere in the run.
The code sat on the product path; the defect was in what the instrument could say. **A gate that
fails open is trusted wrongly; a path that swallows its errors cannot be diagnosed at all.**

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
