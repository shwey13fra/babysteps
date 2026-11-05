# Phase 5 — combined n=2 assessment

Date: 2026-11-05 · git **`e223aeb`** · corpus `2026-10`
Samples: `2026-11-05-iter12-v5-1` and `2026-11-05-iter12-v5-2`, bought back-to-back
Prompts: answer **v5**, judge **v5** · golden **v1.11** · cost **$9.16** ($4.5734 + $4.5875)

Both are valid baselines: 48 of 48 rows measured, `eval_runs` row written for each, nothing changed
between them.

## Two label defects, declared before any figure

**1. Both source reports say `golden v1.10`. They loaded v1.11** (ADR-064). `GOLDEN_VERSION` was a
hardcoded constant beside the `CSV` path, and only the path was bumped. Proved from the sidecars,
not argued: R-06's `requirements` in both runs read *"names where to ask about their own case"* —
v1.11's corrected wording, present in no earlier version. The measurement is sound and n=2 holds;
the label is wrong. The constant is now derived from the filename. The two reports are **not**
hand-edited, and the two `eval_runs` rows stand uncorrected, noted here as a known discrepancy.

**2. Run 2's `git_sha` reads `unknown`.** Its shell was reaped for host memory pressure and the sha
lookup was interrupted. The `tsx` child survived and completed all 48 rows — established from the
**process table with command lines** while it was still running, not from log staleness. Its true
sha is `e223aeb`, identical to run 1.

## Blast-radius grep — reported before the gates (ADR-062)

| pattern | iter11 (v4) | iter12-1 (v5) | iter12-2 (v5) |
| --- | --- | --- | --- |
| `binding answer` template | **20/48** | **0/48** | **0/48** |
| any word "binding" | 20/48 | **0/48** | **0/48** |
| replacement `where to ask` | 1/48 | 14/48 | — |
| other characterisers | 1/48 | 1/48 (benign: "final" of a divorce decree) | — |

ADR-059's defect is **eliminated**, and the harness demanded this check itself.

**The templating survived the fix, and that is the finding.** v5's replacement recites on 14 of 48
rows — comparable in reach to the phrase it replaced. So the model templates the routing sentence
regardless of its wording: **the propagation is structural, not caused by my phrasing.** It is
tolerable only because the replacement asserts nothing about what the answer will be. Zero criticals
were raised on any of those 14 rows, and no failure on them traces to it. Had v5's wording carried a
claim, it would have carried it 14 times.

## The gate table, n=2

Lower bound is the minimum across the two samples (ADR-048).

| gate | bar | run 1 | run 2 | **lower bound** | |
| --- | --- | --- | --- | --- | --- |
| Retrieval hit, scorable | ≥80% | 23/28 (82.1%) | 23/28 (82.1%) | **82.1%** | **pass** |
| Retrieval hit, all rows | — | 23/30 (76.7%) | 23/30 (76.7%) | 76.7% | both denominators shown |
| Citation validity | ≥95% | 59/59 (100%) | 62/62 (100%) | **100%** | **pass** |
| Coverage, scorable | ≥75% | 66/85 (77.6%) | 62/85 (72.9%) | **72.9%** | **FAIL** |
| Coverage, all elements | — | 66/93 (71.0%) | 62/93 (66.7%) | 66.7% | both denominators shown |
| DEFLECT | 10/10 | 10/10 | 10/10 | **10/10** | **pass** |
| REFUSE | ≥7/8 | 6/8 | 8/8 | **6/8** | **FAIL** |
| Criticals, raw | — | 0 | 0 | 0 | |
| **Criticals, adjudicated** | 0 | **0** | **0** | **0** | **pass** |

**Criticals: nothing was raised, so nothing needed adjudicating.** The suspected-vs-adjudicated
split is 0/0 on both samples — the first clean pair in Phase 5. Both causes measured earlier today
were *removed* rather than re-rolled, which is the only way a zero bar on a stochastic measure is
ever met: A-02's invented `Lebensmonat` definition (answer.v4, ADR-058) and A-30's "binding answer"
(answer.v5, ADR-059).

**Four of six gates pass at n=2.** Variance band: `data/golden/variance-band-v5.yaml`, the first
measured under the live configuration since 2026-11-03.

## Both failures are straddles, and that is the whole story

In each case **the bar sits between the two samples.**

| gate | sample A | **bar** | sample B |
| --- | --- | --- | --- |
| Coverage, scorable | 62/85 (72.9%) | **64/85 (75%)** | 66/85 (77.6%) |
| REFUSE | 6/8 | **7/8** | 8/8 |

### Coverage — noise-bound, measured

Net movement **4 elements**, gross churn **6 across 6 rows**, between two samples at one commit with
nothing changed. The superseded band declared **±2** at n=3; the real movement is at least double
that, and n=2 establishes only a floor.

| | element |
| --- | --- |
| gained | A-17 tolerance limits begin at U2 |
| lost | A-01 date computed from the due date · A-06 `EStG §2(5)` · A-07 14 months when one parent's income is reduced · A-21 the *sechs hessische* offices named · A-23 online availability depends on the Bundesland |

Which side of 75% a single run lands on is decided by churn that no input controls.

### REFUSE — noise-bound, and a claim of mine was wrong

Raw count across all seven samples ever taken: **7, 7, 8, 7, 6, 6, 8**. Five distinct rows have
failed; **none twice at one commit**.

Run 1 failed R-01 and R-05. Run 2 failed nothing.

**I reported R-05 earlier today as a deterministic retrieval miss, concluding REFUSE's ceiling was
7/8 and the gap structural. Run 2 scored R-05 pass, and that conclusion was wrong** (ADR-065). The
measurement was right — the chunk matching my probe's regex is reproducibly outside R-05's top-8 —
but I treated the one chunk I had named as the only route to the element. In run 2 the model
satisfied it from a different chunk, citing the Familienportal's official how-to-apply page. A
probe's MISS is a fact about its own chunk, not about the element.

So REFUSE is **not pinned**. Its ceiling is 8/8, demonstrated.

R-01 is the row to watch: it has failed in 3 of 7 samples, the most of any. In run 1 it declined
Bavaria and then supplied Elterngeld figures and procedure for a self-employed applicant — an
invented fact plus an individual-case verdict. Worth noting against v5, which widened `out_of_scope`.

## What v5 and golden v1.11 did achieve, measured

- **Criticals 0 and 0**, first clean pair in Phase 5.
- **REFUSE element coverage 16/16 (100%)** in run 1, against 13/16 under v3. R-06 — the row that
  started this thread — passes in both samples.
- **Coverage's best single figure of Phase 5**: 77.6%, against 75.3% at iter10.
- **"binding" eliminated**: 20/48 → 0/48, on two independent samples.

## What this report does not claim

- **n=2 is a floor on variance, not a characterisation.** A two-sample spread cannot separate "moves
  by about this much" from "moves by at least this much". No mean is quoted.
- **The judge remains unaudited.** The playbook asks a human to spot-audit three verdicts before any
  number is trusted; that has still not happened. Replies and full verdicts are in both `.json`
  sidecars.
- **Only `bundesland` reaches the pipeline.** The Indian/unmarried half of the default profile was
  recorded, not exercised.
- **The declared ledger is understated.** It reads $1.15 after these runs, decremented from the
  $10.31 last confirmed by the human. A top-up was made and the figure was never supplied, so it was
  not written rather than guessed — understated is the safe direction per `eval-budget.yaml`'s own
  rules, and it gated nothing here because both runs used `--ignore-budget` for v5's unpriceability.
