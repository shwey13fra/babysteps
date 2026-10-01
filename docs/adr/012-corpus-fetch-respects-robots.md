# ADR-012: Ingest gesetze-im-internet via its official downloads, never by scraping

Date: 2026-10-01 · Status: accepted — blocks Phase 2, not implemented yet

## Context
Phase 2 ingests MuSchG, BEEG, BKGG, BGB, StAG, AufenthG and SGB V from gesetze-im-internet.de.
That site's robots.txt disallows automated fetching. The playbook's Phase 2 prompt says "fetch per
corpus_manifest.yaml", which read naively means an HTML crawler — exactly what robots.txt refuses.
The site publishes each statute as an official XML and EPUB download intended for reuse.

## Decision
Build `data/corpus_manifest.yaml` around the per-statute XML/EPUB downloads, not HTML pages.
`scripts/ingest/fetch.ts` never requests a path robots.txt disallows, for this or any source. The
parser reads the official XML, whose section structure is explicit, rather than recovering § and
heading boundaries from rendered HTML.

## Alternatives
Scrape the HTML anyway — rejected: it ignores a stated machine-readable prohibition, on a
government source, for a product whose entire claim is that it cites official law properly. Fetch
by hand once and commit the text — rejected: `data/raw/` is gitignored precisely because the corpus
is not ours to redistribute, and it would not refresh.

## Consequence
Chunking reads XML, so the Phase 2 chunker splits on the document's own section elements instead
of guessing boundaries — better input, and the §-never-orphaned-from-its-heading rule becomes
structural rather than heuristic. EPUB or HTML stays the fallback only where a source publishes no
XML; those sources need their own robots.txt check first. Consular pages are unaffected: they were
already manual-curation with review dates.
