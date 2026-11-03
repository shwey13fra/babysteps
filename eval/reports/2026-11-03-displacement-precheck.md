# Displacement pre-check — section completion OFF vs ON

Date 2026-11-03 · golden v1.7 · 30 rows · budget 12800 est. tokens
Retrieval only. **No model calls.** One embedding per row.

Both lists come from one retrieval per row: `ranked` is fixed before completion is
consulted, so the OFF list is `completeSections(ranked, [])` computed locally.
Re-embedding variance is excluded by construction, not assumed away.

## Result

| | rows |
| --- | --- |
| gained at least one chunk | 21 / 30 |
| **dropped at least one chunk** | **0 / 30** |
| gave up a completion to the budget | 0 |
| at or over the token budget | 0 |
| non-contiguous § seen | 1 |
| chunks added, total | 42 |
| est. tokens, off → on | 123534 → 141718 |

## Per row

| id | cat | land | hits off→on | est. tokens off→on | added | dropped | budget-skipped | guidance in ranked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | ANSWER | hessen | 8→12 | 4304→6098 | 4648 4572 4574 4592 | — | — | 2/8 |
| A-02 | ANSWER | hessen | 8→8 | 4939→4939 | — | — | — | 1/8 |
| A-03 | ANSWER | hessen | 8→9 | 4273→4940 | 4589 | — | — | 1/8 |
| A-04 | ANSWER | hessen | 8→9 | 4710→4901 | 4648 | — | — | 5/8 |
| A-05 | ANSWER | hessen | 8→9 | 5357→5470 | 4527 | — | — | 5/8 |
| A-06 | ANSWER | hessen | 8→11 | 5021→7305 | 4563 4558 4559 | — | — | 3/8 |
| A-07 | ANSWER | hessen | 8→8 | 5227→5227 | — | — | — | 3/8 |
| A-08 | ANSWER | hessen | 8→9 | 4745→5046 | 4574 | — | — | 3/8 |
| A-09 | ANSWER | hessen | 8→8 | 3263→3263 | — | — | — | 3/8 |
| A-10 | ANSWER | hessen | 8→11 | 3193→5409 | 4618 4619 4563 | — | — | 3/8 |
| A-11 | ANSWER | hessen | 8→9 | 3264→3381 | 4653 | — | — | 4/8 |
| A-12 | ANSWER | hessen | 8→9 | 3366→3484 | 4653 | — | — | 5/8 |
| A-13 | ANSWER | hessen | 8→9 | 3429→3547 | 4653 | — | — | 3/8 |
| A-14 | ANSWER | hessen | 8→9 | 3172→3364 | 4648 | — | — | 3/8 |
| A-15 | ANSWER | hessen | 8→8 | 3395→3395 | — | — | — | 4/8 |
| A-16 | ANSWER | hessen | 8→9 | 4326→4467 | 4645 | — | — | 4/8 |
| A-17 | ANSWER | hessen | 8→10 | 3855→4906 | 5218 5219 | — | — | 4/8 |
| A-18 | ANSWER | hessen | 8→9 | 4445→4598 | 4571 | — | — | 3/8 |
| A-19 | ANSWER | hessen | 8→9 | 2450→2568 | 4653 | — | — | 5/8 |
| A-20 | ANSWER | hessen | 8→8 | 4003→4003 | — | — | — | 4/8 |
| A-21 | ANSWER | hessen | 8→8 | 3201→3201 | — | — | — | 3/8 |
| A-22 | ANSWER | berlin | 8→8 | 4292→4292 | — | — | — | 4/8 |
| A-23 | ANSWER | hessen | 8→10 | 4538→5618 | 4559 4560 | — | — | 4/8 |
| A-24 | ANSWER | hessen | 8→10 | 2940→3305 | 5235 5237 | — | — | 4/8 |
| A-25 | ANSWER | hessen | 8→8 | 4851→4851 | — | — | — | 4/8 |
| A-26 | ANSWER | hessen | 8→15 | 4948→8135 | 4609 4612 4607 5210 5211 5213 5214 | — | — | 1/8 |
| A-27 | ANSWER | hessen | 8→11 | 4913→6263 | 4653 4609 4558 | — | — | 1/8 |
| A-28 | ANSWER | hessen | 8→9 | 4871→5024 | 4571 | — | — | 4/8 |
| A-29 | ANSWER | hessen | 8→12 | 5105→7580 | 4559 4560 4572 4573 | — | — | 2/8 |
| A-30 | ANSWER | hessen | 8→8 | 3138→3138 | — | — | — | 3/8 |

