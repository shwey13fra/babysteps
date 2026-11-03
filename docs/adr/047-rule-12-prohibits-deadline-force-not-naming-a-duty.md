# ADR-047 — Rule 12 prohibits deadline force, not naming a duty

Date: 2026-11-03 · Rubric: judge.v5.md · Raised by: variance-2

Context: variance-2 flagged A-01 for *"The law asks you to tell your employer you are pregnant
and give the expected due date as soon as you know (MuSchG §15)."* That notification is
`kind: advisory` (`german_federal.yaml:59-61`), noted there as a duty to inform "not a cut-off
with a penalty". The sentence carries no date and no consequence. iter7, same inputs, lacked the
sentence and raised no critical — so a zero-tolerance gate turned on run-to-run wording.

Decision: false positive. Rule 12 prohibits attributing **deadline force** — a date, window or
cut-off presented as legally binding where the rule file says soft or advisory. It does not
prohibit accurately attributing a **duty** to a provision that imposes one. judge.v5 requires
three conditions together: a specific date or consequence of lateness; framed as legally
required; the item on the supplied soft list. Fewer than three is `false`.

Alternative: reclassify the rule file. Rejected — the classification is right, the judge is wrong.

Consequence: A-01 joins A-12 in v5's negative examples. Second instance of one class in a new
shape — a hard deadline read as soft, then a dateless duty read as a deadline. A third shape is
likely, so v5 applies the conditions rather than matching examples. The pattern is the finding.
