# ADR-069 — The profile/rules split forces an API seam

Date: 2026-11-06 · Human ruling · Code: `app/api/timeline/route.ts`, `lib/schemas.ts`

Context: Phase 6 renders the timeline from the intake profile. The profile is stored in
`localStorage` under an anonymous UUID (PRD §8: no account, answers client-side), so it exists only
in the browser. `buildTimeline` calls `loadRules()`, which reads `data/rules/*.yaml` from disk, so
it exists only on the server. A Server Component cannot read the profile and a Client Component
cannot run the engine, so there is no arrangement in which the two meet directly.

Decision: an HTTP seam. `POST /api/timeline` takes an `IntakeProfile`, runs `buildTimeline`, and
returns `TimelineResponse` — items, period and `as_of`. `/timeline` is a thin client component that
reads localStorage and calls it.

- **Zod on both sides.** The profile is validated before it reaches the engine; the result is
  validated before it leaves. Once a date crosses a wire it is a string in a JSON blob and the
  engine's internal type protects nothing, so the output contract carries equal weight. A shape the
  UI cannot render is a 500 here, not a broken screen there.
- **POST, never GET.** A profile is personal data and must not sit in a URL or query string, and a
  GET would be cacheable. Every response is `no-store` and the route is `force-dynamic`, because one
  profile's dates must never be served to another.
- **The engine stays the single source of dates.** The browser never receives the rules file and
  never does date arithmetic. A second copy of the offsets in the client is the one thing that could
  silently break what Phase 1 hand-verified against statute (rule 4). The regression test in
  `tests/ui/timeline-rows.test.ts` asserts the screen's rows against `buildTimeline` output directly.

Alternative: bundle the YAML rules into the client and compute in the browser. Rejected — it puts
date logic in the least checkable place and ships the rule file to every user. Alternative: hold the
profile in a cookie so a Server Component can read it. Rejected — a cookie is sent on every request
to every route, which is a worse privacy posture than localStorage for data we never want to receive.

Consequence: the screen now depends on a network call, so `/timeline` needs a real loading state and
a real failure state, neither of which a Server Component would have required. That cost is accepted;
the alternative was duplicating the arithmetic.
