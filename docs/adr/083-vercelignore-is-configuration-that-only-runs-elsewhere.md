# ADR-083 — `.vercelignore` is configuration that only runs on someone else's machine

**Date:** 2026-11-16 · **Status:** accepted · **Stage E**

## Context

The first Vercel deployment failed:

```
module not found: ./lib/supabase/server
Import trace:  ./app/api/ask/route.ts  ./app/api/ics/route.ts
```

`.vercelignore` uses `.gitignore` syntax, in which **a pattern containing no internal slash matches
that name at any depth**. The line `supabase/` was written for the root migrations directory. It
also matched **`lib/supabase/`** — the only database client the application has. Vercel deleted it
from the upload, and the build failed on the two routes that import it.

Proven before changing anything, with git's own matcher in a scratch repository:

```
EXCLUDED  lib/supabase/server.ts        <-- supabase/
EXCLUDED  supabase/migrations/0001.sql
kept      lib/prompts/answer.v1.md
kept      data/rules/a.yaml
```

**Why nothing caught it.** `.vercelignore` is not applied to a local build. `npm run build` was
green every single time, including the run minutes before the deploy. The file is configuration
whose only effect happens on a machine we never see — **the same shape as ADR-081**, where
`next dev`'s cross-origin block could not be reproduced locally either. Two deploy-class defects in
two days, both invisible to a green local gate.

## Decision

1. **Every pattern is anchored with a leading `/`.** That is what each line already meant. Only
   `lib/supabase` actually collided, but all patterns are anchored to kill the class rather than
   the instance.
2. **`tests/deploy/vercelignore.test.ts` asserts it two ways.** First, that every pattern begins
   with `/`. Second — and this is the part that matters — that **git's own matcher** agrees `app/`,
   `lib/supabase`, `lib/prompts` and the runtime data directories survive, while the developer
   files genuinely are excluded. The second list is the denominator: without it the first check
   would pass over a file that excluded nothing at all.
3. **The matcher is git's, not ours.** Re-implementing gitignore semantics in the test would
   reproduce exactly the misunderstanding that caused the outage.

## Consequence

The deployment builds. More usefully, a whole class of defect is now caught by `npm test` rather
than by a failed deploy.

**The generalisable lesson, which is why this is an ADR and not a commit message:** a green local
build says nothing about configuration that only executes elsewhere. `.vercelignore`,
`allowedDevOrigins`, environment variables and platform settings all share that property. Each one
needs either a test that evaluates it with the real engine — as here — or a check against the
deployed origin, which is what `scripts/security/deploy-smoke.ts` now provides.
