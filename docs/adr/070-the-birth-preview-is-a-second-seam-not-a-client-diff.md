# ADR-070 — The birth preview is a second seam, not a client-side diff

Date: 2026-11-06 · Code: `app/api/birth-preview/route.ts`, `lib/ui/birth-diff.ts` · Follows: ADR-069

Context: F2b asks "what moves if the baby was born on this day?" before anything is committed. The
answer is `computeDateChanges(before, after)`, which builds two timelines and therefore reads
`data/rules/*.yaml` from disk. The screen is a client component because the profile is in
localStorage. Same split as ADR-069, one layer up.

Decision: a second seam, `POST /api/birth-preview`, taking `{ profile, birth_date }` and returning
the changes plus the Mutterschutz period on both sides. The alternative — calling `/api/timeline`
twice and diffing in the browser with `keyDate` — was rejected: it is a second implementation of
`computeDateChanges`, and the engine is the single source of what moved as well as of where things
land. `days_early` is computed server-side by the engine's `diffDays` for the same reason, so the
screen never subtracts one date from another.

- **Nothing is committed.** The route is a pure function of its inputs; the profile it receives is
  returned unchanged, and the commit is a `localStorage` write the user triggers.
- **The candidate date is validated by building the profile it would produce**, so a preview can
  never accept a date the commit would reject — a birth in the future included.
- **`period_before` and `period_after`** carry the protection period on both sides. An early birth
  changing eight weeks to twelve is the one consequence that is NOT a moved date, so it would be
  invisible in a diff list.

Consequence: two routes now share a no-store header block, a `fail()` helper and a `parseProfile`
guard. That duplication is accepted for two routes and should be extracted if a third appears.

Found while building this: `IntakeProfile.safeParse` can **throw** instead of returning
`success:false`, because its `.refine` calls `diffDays`, which throws on a non-ISO date, and zod
runs the refinement even after the field check has failed. Both routes guard against it so
malformed input gets a 400 rather than a 500. **The root cause is in `lib/schemas.ts` and is
reported, not fixed here** (rules 1 and 3).
