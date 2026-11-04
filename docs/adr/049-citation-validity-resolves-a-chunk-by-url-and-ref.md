# ADR-049 — Citation validity resolves a chunk by url AND ref

Date: 2026-11-04 · Code: `scripts/eval/citations.ts`, `tests/eval/citations.test.ts` · Evidence:
`data/cache/chunks.json`, `eval/reports/2026-11-03-variance-{iter7,2,3}.json`

Context: validity resolved a citation through a map keyed on `source_url` alone, built as
`new Map(hits.map(h => [url, h]))` — which keeps only the LAST chunk per URL — then tested whether
that chunk contained the cited §. Two measurements over the corpus: **exactly one** source URL
carries more than one `section_ref` (the Kinder-RL PDF, 72 of them; every other source is one §
per URL), and **250 of 250** statute chunks contain their own section number in `content` because
the chunker prepends the ref. So the test passed trivially wherever the lookup was right, and on
the one multi-§ source collapsed 72 sections into one chunk: at most one citation of any set could
pass. A-17 cites Kinder-RL §1, §2 and §3 — all correct, all on-topic — and scored 0/3 in three
consecutive runs. That was the entire citation-validity gap against the gate.

Decision: resolve by `(url, ref)`. Scoring moves to `citations.ts`, which is unit-tested, because
`run.ts` cannot be — `main()` runs at import. The content test stays, unchanged in meaning.

Alternative: validate the cited § against the source document rather than the chunker's prefix.
Rejected for now — it changes what the gate measures, and one instrument change per run is the
discipline that produced every trustworthy figure here (ADR-046). Filed, not done.

Consequence, stated rather than buried: with the lookup right, this measure has little
discriminating power left. The real guard against a mis-cited § is `fabricated`, which is
ref-keyed and was correct all along. The gate will now read pass, and that is a fact about the
instrument, not about the product.
