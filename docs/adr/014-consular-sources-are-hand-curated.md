# ADR-014: Consular sources are hand-curated because crawling them is forbidden

Date: 2026-10-22 · Status: **accepted**

## Context
ADR-013 kept the per-source robots.txt check for the pages no one had verified. Running it found
`https://www.cgifrankfurt.gov.in/robots.txt` = `User-agent: *` / `Disallow: /` (read 2026-10-22):
automated fetching of the Indian Consulate General Frankfurt is forbidden outright.
`www.indianembassyberlin.gov.in` returns no usable robots.txt (302 to an error page) and
`www.frankfurt.de` returns HTTP 403 on robots.txt, so neither can be shown to permit crawling.
ADR-012 had claimed the *statute* site forbade fetching — it does not. The site that actually
forbids it was named in no ADR.

## Decision
`fetch: manual` in `data/corpus_manifest.yaml` for cgi_frankfurt, indian_embassy_berlin and
frankfurt_standesamt. `scripts/ingest/fetch.ts` must refuse to download any source whose
`robots.allows` is not `true`, treating `unknown` as a refusal. Consular text is curated by hand,
carries `manual_review: true` and `review_after_days: 90`, and keeps no invented `source_url` —
the convention `data/rules/consular_india.yaml` already follows.

## Alternatives
Crawl anyway since the content is public — rejected: the product's claim is correct sourcing, and
ignoring a stated prohibition forfeits that. Treat `unknown` as permitted — rejected: that is the
ADR-012 failure again, asserting permission nobody established.

## Consequence
The consular track cannot be grown by re-running ingestion; it is bounded by hand-curation effort,
and the 90-day review is a standing cost. The fetcher enforces this in code, not by convention, so
a later session cannot re-enable it by editing the manifest alone.
