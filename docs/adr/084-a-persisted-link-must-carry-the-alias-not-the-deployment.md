# ADR-084 — A persisted link must carry the alias, never the deployment

**Date:** 2026-11-16 · **Status:** accepted; one hardening left open · **Stage E**

## Context

The first successful deployment passed 31 of 32 smoke checks. The failure: the `.ics` file carried
the **deployment-specific** hostname rather than the production alias.

```
URL:https://babysteps-germany-6vvsmfqt1-shwey13fras-projects.vercel.app/item/…
```

That is `VERCEL_URL`, which `lib/site-url.ts` falls back to when `NEXT_PUBLIC_SITE_URL` is unset —
a fallback written deliberately, so **a preview build produces links to itself rather than to
production**. Correct for a preview. Wrong for a file that leaves the building.

**It is not cosmetic, and the measurement is the argument:**

| URL in the calendar entry | Response |
| --- | --- |
| `babysteps-germany.vercel.app/birth` | **200** |
| `babysteps-germany-6vvsmfqt1-…/birth` | **302 → Vercel login** |

Vercel's Standard Protection leaves the production alias public and protects deployment-specific
URLs. So a parent who exports a deadline, and months later taps *"record the birth here"* on the
estimated-date line, reaches a **login wall**. That is the silent staleness F2b exists to prevent,
one layer out and past the point where we can correct it — exactly what `add-to-calendar.tsx`'s own
header warns about.

A deployment URL is also immutable and frozen to one build. Even unprotected, a calendar entry
exported today would still be pointing at that build after a year of changes.

## Decision

1. **`NEXT_PUBLIC_SITE_URL` is required in production**, set to the alias. It is documented as one
   of the twelve required variables in `.env.example`.
2. **The smoke asserts it against the deployed origin.** `deploy-smoke.ts` fetches a real `.ics`
   and fails when the `URL` property does not match the origin it asked. A stale or unset value
   cannot reach a beta family without that check going red first.
3. **The fallback stays.** Removing it would make previews generate links to nothing, and preview
   builds legitimately have no alias. The fallback is right; relying on it for a persisted artefact
   is not.

## The distinction worth keeping

Not every link is the same kind of link:

- **Rendered in a browser** — the share link builds from `window.location.origin`
  (`app/timeline/share-link.tsx`), which is correct by construction everywhere and cannot drift.
- **Written into a file that outlives the deployment** — the `.ics`. This one needs the alias,
  because it is read months later with none of our software around it.

`siteUrl()` serves both and cannot tell them apart. That is the gap this ADR records.

## Open, deliberately

**Should `/api/ics` refuse to use the `VERCEL_URL` fallback in production?** It could fail closed —
no calendar file rather than one with a link to a frozen, protected deployment. Arguments both
ways: a 503 on the export is a visible failure a tester reports, whereas a bad link is invisible
until someone taps it months later; against that, the smoke already catches it before any family
sees it, and a new failure mode on a working feature has its own cost.

**Not implemented, and not implemented silently.** Raised for a ruling.

## Consequence

The deployment is one environment variable and one cache-free rebuild from green. The check that
found it runs in seconds and will run before every future release.
