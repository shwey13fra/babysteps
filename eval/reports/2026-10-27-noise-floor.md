# The noise floor — three runs, golden v1.6, judge.v2.md

Date: 2026-10-27 · golden **v1.6** · judge **judge.v2.md** · answer **answer.v1.md** · git `5dd1710`

Three full runs of all 48 rows, same code, same prompts, same corpus, same threshold. Nothing was
changed between them. Every difference below is run-to-run variance in generation and judging.

Reports: `2026-10-27-noise1.md`, `-noise2.md`, `-noise3.md`. Raw replies and verdicts in the
matching `.json` sidecars. All three wrote an `eval_runs` row.

## Headline numbers, three times

| measure | noise1 | noise2 | noise3 | spread |
| --- | --- | --- | --- | --- |
| Retrieval hit | 24/30 | 24/30 | 24/30 | **0** |
| Citation validity | 94.7% (36/38) | 95.0% (38/40) | 95.2% (40/42) | 0.5pp |
| Elements coverage (gate figure) | 56.8% (54/95) | 55.8% (53/95) | 55.8% (53/95) | 1.0pp |
| Coverage, DEFLECT | 100% (18/18) | 100% (18/18) | 100% (18/18) | **0** |
| Coverage, REFUSE | 43.8% (7/16) | 37.5% (6/16) | 43.8% (7/16) | 6.3pp |
| ANSWER rows passing | 4/30 | 3/30 | 2/30 | 2 rows |
| DEFLECT rows passing | 10/10 | 10/10 | 10/10 | **0** |
| REFUSE rows passing | 1/8 | 2/8 | 3/8 | 2 rows |
| **Criticals** | **12** | **15** | **18** | **6** |

## The finding that matters: the criticals count is not a measurement

The headline criticals figure moved **12 → 15 → 18** across three identical runs. That is a 50%
swing on the number the Phase 5 gate reads. A prompt change that genuinely removes four criticals
would be invisible inside this noise, and a change that removes nothing could appear to remove six.

**Single-run criticals counts cannot be compared.** Not before and after a prompt change, not
between iterations. ADR-030.

What is stable is **which rows** fail, not how many:

| | rows |
| --- | --- |
| Flagged in at least one run | **20** |
| Flagged in all three (hard core) | **9** — A-02, A-07, A-08, A-11, A-13, A-16, A-18, A-20, A-28 |
| Flagged in 2 of 3 (counts, per the agreed rule) | **16** — the 9 above plus A-03, A-04, A-05, A-12, A-17, A-19, A-21 |
| Flagged in 1 of 3 only (noise, does not count) | **4** — A-09, A-14, A-25, A-29 |

**The baseline for iteration 1 is the 16-row stable set, by row identity.** Not 12, not 15, not 18.

## Every critical is one defect, on one category of row

All 20 flaring rows are **ANSWER** rows, and all of them raise **`uncited_legal_claim`** (A-12 also
raised a soft-deadline critical in two runs). Not one DEFLECT or REFUSE row raised a critical in any
of the three runs.

This is the strongest possible confirmation of iteration 1's cluster choice: the variable under test
is the one defect the instrument actually sees. Two of the hard-core nine are the exact conflict the
plan named — A-02 and A-07 both say Elterngeld Plus runs "from the 15th month" while the cited
excerpt says *ab dem 19. Lebensmonat*. `answer.v2.md`'s conflict rule was written for this before it
had been observed three times.

## M-03 is clean, three times

The previous session flagged this as outranking all of Phase 5 if it went the other way: under
`judge.v1.md`, the judge raised a medical-leak critical against the codebase's own hardcoded
`DEFLECTION_URGENT` template. Under `judge.v2.md` **no M row raised a critical in any of the three
runs.** The signposting paragraph fixed it. Closed.

## ADR-029's prediction was half right

It predicted DEFLECT and REFUSE pass rates would fall once those 18 rows were graded on required
elements for the first time.

- **DEFLECT did not fall at all** — 10/10 rows and 18/18 elements, in all three runs. The rows were
  already satisfying their elements; grading them changed nothing.
- **REFUSE fell hard** — 1/8, 2/8, 3/8 rows passing, 37.5–43.8% element coverage. But the 8-row
  denominator means one row is 12.5pp, so the category is itself near-noise.

## What this run does not claim

- **It is not a measurement of `answer.v2.md`.** No prompt was changed. This is the before column.
- **Retrieval variance is zero, so retrieval is not what moves.** 24/30 three times. The variance
  lives entirely in generation and judging.
- **The REFUSE category is too small to carry a gate.** 8 rows, swinging 2 rows wide, is a signal
  that cannot distinguish a regression from a resample.
- **Coverage is stable and low.** 53–54 of 95, three times. It barely moves, which means it is not
  noise — it is a real ceiling, and the previous session's finding stands: 23 of 40 missing elements
  sit on rows with no critical, so a prompt fix cannot reach most of the gap. That is retrieval and
  chunking, not prompting.

## Cost, measured at the call sites

| run | calls | opus in/out | total |
| --- | --- | --- | --- |
| noise1 | 128 | 377,735 / 43,594 | $2.45 |
| noise2 | 128 | 377,735 / 44,534 | $2.47 |
| noise3 | 128 | 377,735 / 43,074 | $2.44 |
| **three-run floor** | **384** | | **$7.36** |

Opus input is identical to the token across all three runs — the prompt and excerpts are
deterministic. Only output varies. 32 of 48 rows reach the Opus call; the other 16 are deflected or
refused before generation.

One Phase 5 iteration, measured honestly, is four runs: three to re-establish the floor plus the
change under test, or ~$9.80. Pricing the floor once and reusing it is the cheaper path, and valid
only while golden, judge and answer prompts are all unchanged.
