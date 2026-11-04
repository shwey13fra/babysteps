# ADR-053 — Advice elements are golden-set defects, not a prompt target

Date: 2026-11-04 · Human ruling · Golden: v1.9 · Supersedes: class F of the 2026-10-31 report

Context: the 2026-10-31 coverage classification put 2 of 27 missing elements in "class F — the
element is advice or an inference", and left the question open: *"Either the prompt permits a
procedural recommendation that follows from a cited deadline, or these two goldens are
mis-specified."* ADR-045 then counted them among "13 prompt-fixable elements", which assumed the
first branch. `answer.v2.md` suppresses that register deliberately, and loosening it runs toward
rule 13.

Decision, ruled by the human: **both are mis-specified goldens.** Removed in v1.9. The answer
prompt's register is not relaxed, and no ADR is spent permitting recommendations.

- **A-02, "apply as early as possible after birth"** — removed as fully redundant advice. Elements
  1 and 2 already carry all of BEEG §7(1). It also contradicted its own row: A-02's
  `must_not_contain` is `a fixed 92-day statutory deadline`, so the row exists to check the model
  does *not* turn a retroactivity window into a deadline, while this element asked it to urge
  promptness.
- **A-16, "register promptly so cover runs from the date of birth"** — removed because its legal
  half is **wrong**, which the classification report had not found. SGB V §10(1): *"Versichert
  **sind** … die Kinder von Mitgliedern"* — the Familienversicherung arises by operation of law.
  §10(6) makes registration a notification duty. The element makes registration the trigger for
  cover; it is not. Correcting it to "cover runs from the date of birth" was rejected because
  **nothing in the corpus states that** — it would manufacture an unanswerable element.

Alternative: permit a recommendation that follows from an already-cited deadline. Rejected by the
human. It would buy 2 elements at the cost of the one register boundary that rule 13 depends on.

Consequence: ANSWER requirements 95 → 93, so **a gate denominator moves** — the first golden
change to do so since v1.7. Coverage reads 60/85 = 70.6% where it read 60/87 = 69.0%, with the
gate at 64 of 85 rather than 66 of 87. **Nothing improved**: the bar fell by two elements because
two unmeetable elements left the set. The v1.9 changelog says so and every report carries both
figures. Also flagged, deliberately unchanged: A-16's fourth element (the child's insurance
number) is unreachable — 0 chunks — but it is not advice, so it is outside this ruling.
