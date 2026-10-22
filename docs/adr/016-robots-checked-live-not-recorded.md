# ADR-016: Permission is checked live at fetch time, not recorded in the manifest

Date: 2026-10-22 · Status: **accepted — amends ADR-014's facts, keeps its decision**

## Context
ADR-014 recorded `www.frankfurt.de` as "permission unverifiable, robots.txt HTTP 403". That
probe was sent with **no User-Agent and without following redirects**. Frankfurt's robots.txt
actually reads `User-agent: * / allow: /`. The 403 was bot protection refusing a stranger, and
it was written down as a statement of policy — the ADR-012 error class, inside the ADR written
to correct it. `indianembassyberlin.gov.in` was likewise recorded as "unverifiable"; its host
simply returns 404. Only `cgifrankfurt.gov.in` (`Disallow: /`) was right.

## Decision
`scripts/ingest/robots.ts` fetches and evaluates robots.txt **at fetch time**, with the same
User-Agent and redirect handling as the content request; longest-match wins, `Allow` breaks ties.
The manifest's `robots` field becomes a dated observation for the audit trail, and `fetch.ts`
prints ROBOTS DRIFT when the live verdict disagrees with it. Unreadable robots.txt: 404/410 means
allowed (RFC 9309); anything else is **refused**, which is stricter than RFC 9309's "4xx means no
restrictions" and is the deliberate posture for a product whose claim is correct sourcing.

## Alternatives
Keep hand-recorded verdicts and re-check by hand — rejected, that is the failure twice over.
Follow RFC 9309 exactly and treat 403 as permitted — rejected, "the server would not tell us" is
not permission. Spoof a browser fingerprint past Frankfurt's bot protection — rejected outright:
that circumvents an access control.

## Consequence
Three sources stay `manual` for now-accurate and distinct reasons: cgi_frankfurt (`Disallow: /`),
frankfurt_standesamt (robots permits, but bot protection 403s this client for robots.txt and
content alike), indian_embassy_berlin (host 404s; needs a human to confirm the current URL).
Verified on 12 real cases including both known traps. First run after this: 29 pages fetched,
0 refused, 0 drift.
