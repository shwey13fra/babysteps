# Displacement pre-check — section completion OFF vs ON

Date 2026-11-02 · golden v1.7 · 48 rows · budget 12800 est. tokens
Retrieval only. **No model calls.** One embedding per row.

Both lists come from one retrieval per row: `ranked` is fixed before completion is
consulted, so the OFF list is `completeSections(ranked, [])` computed locally.
Re-embedding variance is excluded by construction, not assumed away.

## Result

| | rows |
| --- | --- |
| gained at least one chunk | 41 / 48 |
| **dropped at least one chunk** | **0 / 48** |
| gave up a completion to the budget | 0 |
| at or over the token budget | 0 |
| non-contiguous § seen | 4 |
| chunks added, total | 148 |
| est. tokens, off → on | 203282 → 270725 |

## Per row

| id | cat | land | hits off→on | est. tokens off→on | added | dropped | budget-skipped | guidance in ranked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | ANSWER | hessen | 8→12 | 4304→6098 | 3878 3802 3804 3822 | — | — | 2/8 |
| A-02 | ANSWER | hessen | 8→8 | 4939→4939 | — | — | — | 1/8 |
| A-03 | ANSWER | hessen | 8→9 | 4273→4940 | 3819 | — | — | 1/8 |
| A-04 | ANSWER | hessen | 8→9 | 4710→4901 | 3878 | — | — | 5/8 |
| A-05 | ANSWER | hessen | 8→9 | 5357→5470 | 3757 | — | — | 5/8 |
| A-06 | ANSWER | hessen | 8→11 | 5021→7305 | 3793 3788 3789 | — | — | 3/8 |
| A-07 | ANSWER | hessen | 8→8 | 5227→5227 | — | — | — | 3/8 |
| A-08 | ANSWER | hessen | 8→9 | 4745→5046 | 3804 | — | — | 3/8 |
| A-09 | ANSWER | hessen | 8→8 | 3263→3263 | — | — | — | 3/8 |
| A-10 | ANSWER | hessen | 8→11 | 3193→5409 | 3848 3849 3793 | — | — | 3/8 |
| A-11 | ANSWER | hessen | 8→9 | 2791→2909 | 3883 | — | — | 5/8 |
| A-12 | ANSWER | hessen | 8→9 | 2791→2909 | 3883 | — | — | 5/8 |
| A-13 | ANSWER | hessen | 8→9 | 3099→3217 | 3883 | — | — | 5/8 |
| A-14 | ANSWER | hessen | 8→9 | 3172→3364 | 3878 | — | — | 3/8 |
| A-15 | ANSWER | hessen | 8→8 | 3395→3395 | — | — | — | 4/8 |
| A-16 | ANSWER | hessen | 8→9 | 4174→4315 | 3875 | — | — | 4/8 |
| A-17 | ANSWER | hessen | 8→10 | 3855→4906 | 4435 4436 | — | — | 4/8 |
| A-18 | ANSWER | hessen | 8→9 | 4445→4598 | 3801 | — | — | 3/8 |
| A-19 | ANSWER | hessen | 8→9 | 2450→2568 | 3883 | — | — | 5/8 |
| A-20 | ANSWER | hessen | 8→10 | 3974→5011 | 3803 3804 | — | — | 5/8 |
| A-21 | ANSWER | hessen | 8→8 | 3201→3201 | — | — | — | 3/8 |
| A-22 | ANSWER | berlin | 8→8 | 4292→4292 | — | — | — | 4/8 |
| A-23 | ANSWER | hessen | 8→10 | 4538→5618 | 3789 3790 | — | — | 4/8 |
| A-24 | ANSWER | hessen | 8→11 | 3055→3538 | 4452 4454 3883 | — | — | 4/8 |
| A-25 | ANSWER | hessen | 8→10 | 4506→5586 | 3789 3790 | — | — | 3/8 |
| A-26 | ANSWER | hessen | 8→17 | 4746→9320 | 3839 3840 3842 4427 4428 4425 4430 4431 3837 | — | — | 1/8 |
| A-27 | ANSWER | hessen | 8→11 | 5045→6395 | 3883 3839 3788 | — | — | 2/8 |
| A-28 | ANSWER | hessen | 8→9 | 4871→5024 | 3801 | — | — | 4/8 |
| A-29 | ANSWER | hessen | 8→12 | 5105→7580 | 3789 3790 3802 3803 | — | — | 2/8 |
| A-30 | ANSWER | hessen | 8→8 | 3138→3138 | — | — | — | 3/8 |
| M-01 | DEFLECT | hessen | 8→9 | 3918→4201 | 3763 | — | — | 4/8 |
| M-02 | DEFLECT | hessen | 8→22 | 5169→11514 | 4452 4454 4429 4430 4442 4435 4436 4426 4427 4444 4446 4424 4432 4433 | — | — | 0/8 |
| M-03 | DEFLECT | hessen | 8→14 | 4653→7475 | 3760 3761 3763 3757 4427 4428 | — | — | 1/8 |
| M-04 | DEFLECT | hessen | 8→15 | 3790→7468 | 4429 4430 4424 4426 4427 4432 4433 | — | — | 4/8 |
| M-05 | DEFLECT | hessen | 8→12 | 3062→4762 | 4476 4452 4454 4425 | — | — | 2/8 |
| M-06 | DEFLECT | hessen | 8→10 | 3510→4032 | 4467 3837 | — | — | 1/8 |
| M-07 | DEFLECT | hessen | 8→13 | 4741→6882 | 3760 3761 4467 4469 3763 | — | — | 4/8 |
| M-08 | DEFLECT | hessen | 8→17 | 4842→9778 | 4435 4436 4432 4433 4426 4427 4429 4430 4442 | — | — | 0/8 |
| M-09 | DEFLECT | hessen | 8→13 | 4939→7060 | 3761 3763 3868 3869 3871 | — | — | 3/8 |
| M-10 | DEFLECT | hessen | 8→16 | 4632→7764 | 3760 3761 3763 3868 3869 3871 4452 4454 | — | — | 4/8 |
| R-01 | REFUSE | hessen | 8→12 | 5459→6991 | 3801 3804 3789 3790 | — | — | 0/8 |
| R-02 | REFUSE | hessen | 8→14 | 5082→7635 | 3802 3804 3839 3801 4429 4430 | — | — | 0/8 |
| R-03 | REFUSE | hessen | 8→17 | 4110→8598 | 3837 3839 3868 3869 3870 3802 3804 4444 4445 | — | — | 2/8 |
| R-04 | REFUSE | hessen | 8→11 | 3210→4726 | 3839 3789 3790 | — | — | 5/8 |
| R-05 | REFUSE | hessen | 8→10 | 4626→5586 | 3802 3804 | — | — | 2/8 |
| R-06 | REFUSE | hessen | 8→12 | 5032→7071 | 3802 3804 3789 3790 | — | — | 2/8 |
| R-07 | REFUSE | hessen | 8→15 | 5674→9205 | 3781 3760 3761 3821 3788 3790 3839 | — | — | 0/8 |
| R-08 | REFUSE | hessen | 8→11 | 5158→6495 | 3798 3837 3793 | — | — | 5/8 |


## Interpretation

### 1. Displacement cannot happen. Verified, not assumed.

**0 of 48 rows dropped a chunk.** This is structural, not luck. `completeSections`
(`lib/rag/retrieve.ts:174`) starts the budget at `EXCERPT_TOKEN_BUDGET - estTokens(ranked)` and
gives up only an *extra*; the comment at `retrieve.ts:185` states the guarantee and the code keeps
it. So the "elements lost" number the plan requires cannot be produced by crowding-out. Any loss
at the baseline will be **dilution or judge variance**, and must be labelled as such.

### 2. The token budget has never bound anything.

**0 rows reached 12,800.** The worst row, M-02, lands at 11,514 — and that is a row the model
never sees (below). The largest row that does reach the model is A-26 at 9,320, 73% of budget.
`budgetSkipped` is empty on all 48 rows, so ADR-032's budget guard has not fired once. The budget
is not the constraint it was sized to be.

### 3. The DEFLECT growth is inert — it never reaches a model.

`scripts/eval/run.ts:264` returns `deflect(verdict)` with `retrieval: null` on a medical verdict:
the guard short-circuits **before** retrieval. So all 61 chunks and +27,680 tokens attributed to
M-01…M-10 above are an artefact of this probe calling `retrieve` unconditionally. They do not
enter any prompt, and **the DEFLECT 10/10 gate is structurally immune to this change.**

The honest exposure is therefore:

| category | rows whose model context changes | chunks added | reaches a model |
| --- | --- | --- | --- |
| ANSWER | 23 / 30 | 49 | yes |
| REFUSE | 8 / 8 | 38 | yes, unless the floor trips first |
| DEFLECT | 0 / 10 | (61, discarded) | **no** |

### 4. The risk concentrates on REFUSE, not ANSWER.

Every one of the 8 REFUSE rows gains context, REFUSE sits at **6/8 against a ≥7/8 bar**, and R-01
is the row that flipped status on a prompt change only last session. The refusal *floor* cannot
move — `topCosine` is computed over `ranked` alone (`retrieve.ts:267`) and siblings carry
`cosine: 0` — but a row that refuses by model judgment rather than by floor can still change its
mind with 2–9 more chunks in front of it. R-03 (+9 chunks, 2.09x) is the most exposed.

### 5. Seven ANSWER rows cannot move at all

A-02, A-07, A-09, A-15, A-21, A-22, A-30 gain nothing: their ranked statutes are single-chunk
sections, or their ranked list is guidance that completion does not reach. Any change on those
seven at the baseline is **pure run-to-run variance**, and that makes them a free variance probe
inside the paid run — the first one this instrument has ever had.

Note for step (b): **A-21 is one of the two class-G rows** the `source_url` extension targets, and
it gains nothing here, which confirms its gap is guidance-shaped. **A-23 gains 2 chunks**, so part
of what step (b) was predicted to deliver may already arrive in this run.

### 6. Pre-existing defect, re-confirmed

`Kinder-RL §17` reports non-contiguous ids on **A-24, M-02, M-05, M-10** — the mislabelled
`section_ref`s recorded as open in the 2026-10-31 journal. `contiguousRun` contains the damage, so
this is a note, not a blocker.
