# ADR-084 — A persisted link must carry the alias, never the deployment

**Date:** 2026-11-16 · **Status:** accepted; the open question ruled the same day · **Stage E**

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

## Ruled, 2026-11-16: drop the link, keep the file

Neither fail-closed nor leave-it. `siteUrlForPersistedFile()` returns `null` when a **production**
deployment has no alias configured, and every link is then omitted from the calendar file.

The reasoning: a 503 adds a new way for a working feature to break, on a path the smoke already
guards; leaving it relies entirely on someone running that smoke. Omitting the link costs the
parent nothing that matters — the deadline, the date and the alarm are what the export is *for*,
and none of them need a URL. What it removes is the one thing that can do harm months later.

**The link appears twice in the file, not once**, and the ruling covers both:

| Site | What it is |
| --- | --- |
| `lib/ics/events.ts` `url:` | The URL property. The one this ADR originally named. |
| `lib/ics/events.ts` description | `"It will move when the birth is recorded: …/birth"`, on every estimated-date event. |

Dropping only the property would have left a login-wall link in the prose of exactly the six events
that move when a birth is recorded — the tap this ADR was written about. The *sentence* stays; only
the address goes, so the F5 honesty survives: "This date is estimated · counted from the birth. It
will move when the birth is recorded."

**Production is identified by `VERCEL_ENV`, not `NODE_ENV`.** `NODE_ENV` is `"production"` for every
built deployment including previews, so keying on it would strip the link from preview files where
it is perfectly good. A preview still links to itself — that file is read in the same minute it is
made. `siteUrl()` is untouched, so the browser-rendered share link is unaffected.

The source URL is **not** dropped. `gesetze-im-internet.de` is the provenance the entry promises and
is as good in ten years as today. Only our own origin is ours to doubt.

`tests/ics/persisted-url.test.ts`, 16 cases, including the rule-16 negative controls: that the
no-URL assertion still fails when a URL is present, and that it fails on the exact deployment host
that shipped the defect.

## Consequence

The deployment is one environment variable and one cache-free rebuild from green. The check that
found it runs in seconds and will run before every future release.
