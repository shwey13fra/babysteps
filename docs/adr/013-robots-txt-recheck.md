# ADR-013: gesetze-im-internet permits automated fetching; XML ingestion is kept anyway

Date: 2026-10-21 (accepted 2026-10-22) · Status: **accepted — supersedes ADR-012**

## Context
ADR-012 states that gesetze-im-internet.de's robots.txt "disallows automated fetching" and builds
the whole ingestion design on that prohibition. Re-checked 2026-10-21, the file reads:

```
User-agent: *
Disallow:
```

An empty `Disallow:` permits everything. **ADR-012's factual premise is wrong** — either it was
misread, or it was asserted without fetching the file. The decision it reached is still right, but
for the reason buried in its own Consequence paragraph rather than the one it leads with.

## Decision
Keep the official XML downloads as the ingestion path, on the structural argument alone: the XML
carries explicit `<norm>`/`<enbez>` section elements, so "never orphan a § from its heading"
becomes structural rather than heuristic recovery from rendered HTML. Drop the robots claim.
`scripts/ingest/fetch.ts` still checks robots.txt per source before fetching — the check keeps its
value for the Familienportal, Familienkasse, G-BA and state pages, which were never verified.

## Alternatives
Leave ADR-012 standing — rejected: an ADR trail whose stated facts are wrong is worse than none,
and this project's whole claim is that it cites sources properly. Switch to HTML scraping now that
it is permitted — rejected: the XML is better input, permission was never the real argument.

## Consequence
No code changes; the fetch path is unchanged. Verified today against the real XML endpoints:
MuSchG, BEEG, BKGG and SGB V all return 200 at `/<slug>/xml.zip` and parse cleanly. Every future
robots claim in this repo must cite the date it was fetched.
