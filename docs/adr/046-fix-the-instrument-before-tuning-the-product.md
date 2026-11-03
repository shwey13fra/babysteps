# ADR-046: Fix the instrument before tuning the product

Date: 2026-11-03 · Status: accepted · golden v1.8 · judge.v4.md

## Context
The 2026-11-03 baseline failed five of six gates. Three failures were measurement defects, not
product defects: (1) the single critical was a **false positive** — A-12 was flagged for calling
the one-week registration deadline mandatory, but PStG §18(1) says *"binnen einer Woche
anzuzeigen"* and `german_federal.yaml:229` carries `kind: hard`; (2) REFUSE fell 7/8 → 5/8 on two
elements already diagnosed in the v1.7 changelog, with both rows still refusing correctly; (3)
`normalizeRef` read `SGB V §24d` and `SGB X §64` as **null** and `SGB VIII §59` as `VIII §59`.
Tuning retrieval against that instrument would measure the instrument.

## Decision
Correct all three in one pass, because none is a product variable and separating them would cost
an eval each. Golden **v1.8**: R-02's compound element narrowed, R-03's `only` word-demand
replaced, A-13's `ground_truth_source` led by PStV §33. **judge.v4.md**: the supplied soft-deadline
list is declared exhaustive — a deadline absent from it makes the field `false`, not a judgement
call. **`REF_PATTERN`**: one constant, multi-word and hyphenated prefixes, Roman-numeral
continuation only.

## Alternatives
One variable per iteration, three evals — rejected, ~$11 to separate corrections that cannot
interact. Leave the regex — rejected, it is the most serious of the three.

## Consequence
Requirement counts hold at 95/18/16, so no gate denominator moves; exactly 3 golden cells changed,
verified cell by cell. All 13 manifest `ref_prefix` values now normalise correctly. Citation
validity will move: 5 statute citations in the last baseline were counted as guidance, so its
denominator was 51 where 56 was due — and those 5 also skipped the fabricated-reference check,
which raises a critical, so a hallucinated `SGB V §27b` could not have been caught. Previously
invisible fabrications may now surface as new criticals. The next run's numbers are therefore not
comparable to iter6's on citation validity, and that is the point.
