# ADR-007: Embedding model choice, with the cross-lingual comparison table

Date: 2026-10-21 (decided 2026-10-22) · Status: **accepted — text-embedding-3-small at 1024 dims**

## Context
Users type English against a German corpus, so English→DE decides, not DE-only. Measured by
`scripts/eval/embedding-bakeoff.ts`: 5 playbook query pairs, 10 verbatim sections (5 targets,
5 adjacent distractors) from MuSchG/BEEG/BKGG/SGB V.

| Model | dim | EN→DE MRR | EN top-1 | DE MRR | weakest correct EN cosine |
| --- | --- | --- | --- | --- | --- |
| **text-embedding-3-small** | 1024 | **1.000** | **5/5** | **1.000** | 0.436 |
| voyage-3 | 1024 | 0.900 | 4/5 | 0.900 | 0.313 |
| voyage-4 | 1024 | 0.800 | 3/5 | 1.000 | 0.486 |

The voyage ranking **inverts between languages**; OpenAI is the only model that tops both columns.

## Decision
text-embedding-3-small, `dimensions: 1024`. It is the only candidate with no miss on the deciding
column, and it removes voyage's 3 RPM free-tier ceiling, which ingestion cannot live with.

## Alternatives
voyage-3 (4/5 EN) — rejected, loses on the deciding column and has the weakest margin, 0.313.
voyage-4 — rejected, perfect in German but 3/5 in English, the wrong half to win.
voyage-3-lite — rejected, 512 dim ≠ `vector(1024)`.

## Consequence
1024 dim, so `0002_match_chunks_rrf.sql` stands unchanged; `dimensions: 1024` must be passed on
every call or OpenAI returns 1536 and the insert fails. 0.436 is the floor for the ADR-009 cosine
threshold. n=5 — a 5/5 is not proof of superiority over 4/5; widen the probe before trusting the
margin, and re-embedding to reverse costs cents at $0.02/1M tokens.
