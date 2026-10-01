# Architecture decision records

One ADR per non-obvious decision. Copy `000-template.md` to `NNN-kebab-title.md`, max 15 lines
(CLAUDE.md rule 11). Never edit an accepted ADR — supersede it with a new one and update Status.

Add a row below in the same commit that adds the ADR.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| 000 | Template — not a decision | — |
| 010 | Elternzeit notice anchored to the due date at −49 days | accepted |
| 011 | Keep the jurisdiction filter despite no live state-scoped rule | accepted |
| 012 | Ingest gesetze-im-internet via official downloads, never by scraping | accepted, blocks Phase 2 |

## Reserved numbers

Assigned by the source documents before the work started. Keep these free.

| ADR | Title | Source |
| --- | --- | --- |
| 001 | All-TypeScript monorepo | brief §1.1 |
| 002 | Supabase Postgres as the entire data plane | brief §1.2 |
| 003 | EU by default — Frankfurt and fra1 | brief §1.3 |
| 004 | Deterministic dates, generative language | brief §1.4 |
| 005 | No accounts at MVP | brief §1.5 |
| 006 | Ingestion is offline | brief §1.6 |
| 007 | Embedding model choice, with the cross-lingual comparison table | playbook Phase 2 |
| 008 | Switch match_chunks to reciprocal rank fusion | playbook Phase 2 |
| 009 | Refusal threshold, with both cosine distributions | playbook Phase 3 |

## Resolved

**Numbering collision on 002.** Brief §1 reserves ADRs 001–006 for the six architecture decisions;
playbook Phase 1 separately instructed "write ADR-002" for the `elternzeit_notify_employer` anchor
ambiguity. Resolved 2026-10-01: the Elternzeit anchor is **ADR-010**, and 001–006 stay reserved.
