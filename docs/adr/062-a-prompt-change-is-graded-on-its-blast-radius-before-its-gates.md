# ADR-062 — a prompt change is graded on its blast radius before its gates

Date: 2026-11-05 · Status: accepted · Human ruling, standing step · Follows ADR-059

## Context

ADR-059's defect — a prompt example that shipped as output — surfaced as **one critical on A-30**.
Read from the gate table alone it is a row-level problem worth a row-level fix. Grepping the replies
showed the sentence on **20 of 48 rows**. The judge had raised it once because the judge is
stochastic, so the gate table reported 5% of the actual radius.

The measurement costs nothing once the run exists, and it is not inferable from the gates. Measured
across every stored run:

| prompt | rows | replies carrying "binding answer" |
| --- | --- | --- |
| v1 / v2 / v3 (26 runs) | 48 | **0**, bar two historical runs at 1 |
| **v4** partial | 9 | **6** |
| **v4** iter11 | 48 | **20** |

That table also settles ADR-057's diagnosis independently: v3's text *contained* "where they can get
binding information" and emitted it **0/48 times**, because a competing prohibition suppressed it —
which is precisely why R-06 failed under v3. The same contradiction resolved toward suppression in
v3 and toward emission on twenty rows in v4.

## Decision

**Every answer-prompt version change gets a post-run phrasing grep of the stored replies, reported
BEFORE the gate table.** Grep the new or changed wording, count the rows, and compare against the
prior version's runs so the radius is attributed rather than assumed. If a new phrasing has
propagated widely, stop and report — do not buy the next sample.

Recorded in the playbook's Phase 5 VERIFY list. `run.ts` prints the reminder when the answer prompt
differs from the previous report's.

## Alternatives

Trust the judge to catch it — rejected: it caught 1 of 20. Add a `must_not` clause per bad phrase —
rejected: it only finds phrases already known to be bad.

## Consequence

A prompt diff's reach is a measurable quantity, and an instruction's effect is not confined to the
rows whose gates move. Generalises beyond prompts: whenever a change is attributed from an aggregate,
check whether the aggregate could show only a fraction of it.
