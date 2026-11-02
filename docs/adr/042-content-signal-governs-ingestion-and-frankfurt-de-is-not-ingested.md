# ADR-042: Content-Signal governs ingestion, and frankfurt.de is not ingested

Date: 2026-11-02 · Status: **accepted** · Supersedes ADR-016's fetchability finding

## Context
Re-probed 2026-11-02 (ADR-013 requires a re-read before any later ingest): frankfurt.de now
returns **200** for robots.txt and 160 KB of real portal HTML, where ADR-016 recorded 403 for
both. It is mechanically ingestable again. But its robots.txt now carries
`Content-Signal: search=yes,ai-train=no,use=reference` with **`ai-input` omitted** — a use that
same file defines as "retrieval augmented generation, grounding", i.e. this product — under a
header declaring restrictions to be express reservations under Art. 4 of EU Directive 2019/790.
`docs/legal-compliance-pack.md` was silent on robots and TDM, and the manifest had no field for a
content signal. Of all 18 sources, **only frankfurt.de carries a signal at all.**

## Decision
**No frankfurt.de ingestion**, now or after the embedding key is settled. `search=yes` and
`ai-train=no` together show the operator considered AI access deliberately, so the absence of
`ai-input` is unresolved — and unresolved resolves against us. §5 UrhG is not relied on: statutes
and official decrees are amtliche Werke, a municipality's service description page is not
reliably within that category. The cost of being wrong is asymmetric and lands on the one thing
this product sells.

Content-Signal is read **three ways**, because the literal rule "unspecified is not granted" would
block every source in the project, gesetze-im-internet included:
- **no `Content-Signal` line** → nothing reserved, robots.txt governs → **ingestable**
- **signal present, `ai-input` omitted** → deliberate partial specification → **`link_only`**
- **`ai-input=no`** → refused

Every source now carries a dated `content_signal` record in `corpus_manifest.yaml`, re-probed at
`review_after`.

## Alternatives
Ingest and cite anyway — rejected, the reservation is express. Rely on §5 UrhG — rejected, a
service page is not reliably an amtliches Werk. Treat all 18 sources as not granted — rejected,
it shuts the product down and would imply un-ingesting the existing corpus.

## Consequence
**A-13's five elements are unaffected: they are in PStV §33, a federal Rechtsverordnung** — so the
ruling costs nothing here, and the municipality question (ADR-011 one level finer) disappears with
it. `link_only` citation (`citation_mode` on the Citation contract) is still owed for cases where
no alternative source exists, and is a product improvement: the city's page changes without
notifying us, so pointing at it is more honest than caching it. `link_only` elements cannot be
scored by retrieval and get their own bucket. `scripts/ingest/robots.ts` does not yet parse
Content-Signal — until it does, these verdicts are hand-probed, which is the weak link.
