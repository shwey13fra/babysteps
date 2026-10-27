# Golden set v1.6 — annotation drift against ingested text

Date: 2026-10-27 · corpus_version 2026-10 · 770 chunks

Rows in data/golden/golden_set_v1.6.csv: 48 (high 16 · medium 14 · verified 18). This tool examines the **2** still
marked `high` in the ANSWER category — the ones whose ground truth nobody has signed off.
A row already at `verified` was checked in an earlier run and is listed in that run's report;
re-verifying it would overwrite a human sign-off with a tool's opinion. **0 confirmed here
means 0 rows were awaiting verification, not 0 rows checked ever** — read the count above.

Each row's `required_answer_elements` is checked against the **ingested text of the §**
it cites, not against retrieval. Numbers asserted by the annotation are looked for in the
statute. A number the statute does not contain is drift, or an inference the annotation
should not be making from that source.

This report does not adjudicate entitlement (CLAUDE.md rule 13). Rows marked **DECIDE**
assert an amount or threshold and need a human.

| confirmed | drift? | unverifiable |
| --- | --- | --- |
| 0 | 0 | 2 |


### A-24 — Citizenship Act 1955 §4(1) proviso

**UNVERIFIABLE (non-statute source).** How long do we have to register our baby's birth with the Indian consulate?

### A-26 — Indian mission passport guidance

**UNVERIFIABLE (non-statute source).** What do we need for an Indian passport for a baby born in Germany?
