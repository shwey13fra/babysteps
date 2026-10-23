# Golden set v1 — verification pass

Date: 2026-10-22 · corpus_version 2026-10 · 673 chunks · top-k 8

Scope: the 16 `verify_priority: high` rows. The 14 DEFLECT/REFUSE rows
carry no `ground_truth_source` — they assert behaviour, not a citation, so there is nothing
to check against the corpus. That leaves 2 ANSWER rows.

| verdict | n | meaning |
| --- | --- | --- |
| OK | 0 | cited § is in the corpus and the question retrieves it |
| RETRIEVAL | 0 | § is in the corpus but the question does not surface it in top-8 |
| MISSING | 0 | cited § is not in the corpus at all |
| OK-GUIDANCE | 0 | non-statute source; the expected domain is retrieved |
| NOT-INGESTABLE | 2 | consular source; substance unreachable, hand-curated (ADR-019) |

## Rows

| id | juris | ground_truth_source | verdict | detail |
| --- | --- | --- | --- | --- |
| A-24 | consular-india | Citizenship Act 1955 §4(1) proviso | NOT-INGESTABLE | non-statute |
| A-26 | consular-india | Indian mission passport guidance | NOT-INGESTABLE | non-statute |

## Needs a human (CLAUDE.md rule 13)

These assert an amount, threshold or period. This tool must not adjudicate entitlement.

