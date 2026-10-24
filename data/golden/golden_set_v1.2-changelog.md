# golden_set v1.1 → v1.2 — change log

Date: 2026-10-24 · corpus_version `2026-10` · 48 rows, unchanged · **one row corrected: A-03**

Found during the Phase 3 smoke pass, not by a drift tool. The answer layer contradicted the
annotation; the statute was read before the answer was judged, and the statute agreed with the
answer.

`question` text is unchanged in every row, so v1.2 stays comparable with v1.1 and v1.

## A-03 — the annotation was falsified by an amendment, not by an error

*"How much notice do I have to give my employer for Elternzeit?"* — cites BEEG §16(1).

The ingested text of BEEG §16(1) reads:

> … vor Beginn der Elternzeit **in Textform** vom Arbeitgeber verlangen.

`Textform` (BGB §126b) is satisfied by a readable declaration on a durable medium naming its
author. It does **not** require a handwritten signature, and an e-mail satisfies it.
`Schriftform` (BGB §126), which does require one, is a different standard and is not what §16(1)
says.

| field | v1.1 | v1.2 |
| --- | --- | --- |
| `required_answer_elements` | "… written form with original signature; …" | "… Textform (text form) so a letter or an e-mail without a handwritten signature is enough; …" |
| `must_not_contain` | `email is sufficient` | `original signature required; Schriftform; must be signed by hand; must be posted` |

The 7-week and 13-week figures and the two-year declaration are unchanged and still verify.

**Why this is worth a version bump rather than a quiet edit.** The v1.1 annotation was correct
when it was written — Elternzeit was a Schriftform declaration before the amendment. Nothing in
the pipeline could notice it had stopped being correct, because every check compares an *answer*
to the *annotation* and no check compares the annotation to the current source. Left in place it
would have scored a correctly-sourced answer as a **critical failure**, and the obvious fix would
have been applied to the answer layer — teaching the system to assert something the statute does
not say.

The `must_not_contain` inverted rather than being deleted: the forbidden claim is now the
superseded one. A `must_not_contain` is the most brittle kind of annotation, because it forbids a
string instead of asserting what the source says, and it keeps forbidding it long after the
source has changed its mind.

## Not changed in this pass

- **A-06** stays `verified` with the ADR-018 position. It refused in the Phase 3 smoke because
  retrieval did not surface BEEG §1(8) — a retrieval miss, which is Phase 4's measurement and
  Phase 5's single-variable loop, not an annotation problem.
- **A-24, A-26** remain unanswerable until consular text is curated.

## State

| verify_priority | n |
| --- | --- |
| verified | 18 |
| high | 16 |
| medium | 14 |

## Readers updated in the same commit

`scripts/eval/calibrate.ts`, `scripts/eval/golden-drift.ts`, `scripts/eval/guidance-extracts.ts`,
`scripts/eval/verify-golden.ts` — all four, together. The v1.1 bump taught this: two tools held
the same hardcoded path and fixing one reproduced the bug in the other.
