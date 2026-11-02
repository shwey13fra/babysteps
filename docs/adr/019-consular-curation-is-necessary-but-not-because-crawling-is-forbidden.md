# ADR-019: Consular text is hand-curated because it is unreachable, not because it is forbidden

Date: 2026-10-23 · Status: **accepted**, corrects the reasoning of ADR-014

## Context
ADR-014 is titled "Consular sources are hand-curated because crawling them is forbidden." ADR-016
amended its facts once. The title's claim is still wrong, and wrong in the way past-mistakes
2026-10-22 warns about: a refusal from two hosts was recorded as a policy covering a whole class.
Re-probed 2026-10-23 with `scripts/ingest/robots.ts` and the project User-Agent:

| source | robots | verdict |
| --- | --- | --- |
| `www.cgifrankfurt.gov.in` | 200, `Disallow: /` | refused — genuinely forbidden |
| `www.indiacode.nic.in` (Citizenship Act 1955) | 403 | refused by our stricter-than-RFC policy |
| `indianembassyberlin.gov.in` | 404, then a network error minutes later | unreliable, not forbidden |
| `www.mea.gov.in` | 200, no matching rule | **permitted** |

So crawling is permitted on the Ministry of External Affairs' own site. Fetched under that
permission, the Guide to Consular Services yields 21 060 characters that say only that missions
"[r]egister the births and deaths of Indian citizens, in accordance with the relevant Indian
laws" — no registration deadline, no documents, no minor-passport procedure. A-24's one-year rule
lives in the Citizenship Act (refused) and the procedure lives on the mission sites (forbidden,
or flaky).

## Decision
Keep hand-curation, on the correct ground: **the substance is unreachable by any client we are
willing to build**, which is a different fact from "crawling is forbidden" and fails differently.
`data/consular/india.yaml` holds the transcriptions, validated by `lib/rag/consular.ts`, each
carrying `source_url`, `checked_on`, `checked_by`, `method` and a `review_after` capped at 90 days.
`mea.gov.in` is recorded as `method: permitted_fetch` with the robots date, not as a transcription.

## Alternatives
Spoof a browser fingerprint past Frankfurt's bot protection or indiacode's 403 — refused again,
as last session: it is circumvention whatever robots.txt says. Ingest the MEA guide and treat it
as the consular corpus — rejected, it would produce a citable source that does not support the
claim being cited, the inverse of past-mistakes 2026-10-23. Relax the 403 policy to RFC 9309's
"allow" — rejected, it would admit indiacode and Frankfurt alike, and the policy is load-bearing.

## Consequence
The consular track stays mute until a human transcribes the pages in
`docs/consular-curation-worklist.md`, and A-24 and A-26 stay unanswerable until then; the
timeline dates are unaffected, since the engine never depended on retrieval. Staleness is now
detectable rather than invisible: `scripts/eval/consular-staleness.ts` exits 1 on an overdue
entry. If the mission answers the permission letter, this ADR is superseded and the YAML becomes
the crawl's seed rather than wasted work. ADR-014's title remains in the index as written, with
this ADR named beside it — the wrong reasoning is part of the audit trail.

## Amendment 2026-11-02 — the 8 elements are `pending_manual_curation`, not "unreachable"

Re-probed today: `www.cgifrankfurt.gov.in` still returns `200, Disallow: /` — genuinely forbidden,
unchanged. `www.indianembassyberlin.gov.in` now returns **302** where this ADR recorded 404, so the
host is alive and redirecting; the apex still 404s. Neither carries a `Content-Signal` (ADR-042).
No new permission follows from either: the substance is still not on a reachable page.

**The reclassification.** This ADR's language let the 8 consular required elements (A-24: 3,
A-26: 5) be read as permanently out of reach, and two coverage reports then excluded them from the
gate's denominator on that basis. That was never the plan. The addendum §3 provides for consular
sources to be curated by hand on a 90-day review precisely because nothing on
gesetze-im-internet covers Indian consular procedure. Hand curation is the designed path, not a
failure of one.

These 8 elements are therefore labelled **`pending_manual_curation`, target: pre-beta** — work
that is scheduled and owed, with a named worklist (`docs/consular-curation-worklist.md`) and a
human with a browser as its only dependency.

**What this binds.** Any exclusion from the coverage denominator must be justified structurally
(no ingestable source exists — not "we failed to retrieve it"), listed individually by element,
and dated. Every report from now on carries both figures, never one: the scorable number the gate
is assessed on, and the all-elements number, with the exclusions listed beneath. A single
flattering figure does not go in this repo.
