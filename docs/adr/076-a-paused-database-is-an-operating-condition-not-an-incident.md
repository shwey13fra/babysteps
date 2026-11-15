# ADR-076 — A paused database is an operating condition, not an incident

**Date:** 2026-11-15 · **Status:** accepted · **Human ruling:** stay on the Supabase free tier

## Context

On 2026-11-14 `/api/ask` returned its `unavailable` refusal for every question. The product behaved
correctly — the contract held, the panel showed a quiet aside — but the cause was invisible.

Traced: the Supabase project had **paused**, and a paused free project has its **subdomain removed
from DNS**. Confirmed end to end — `NXDOMAIN` on two independent resolvers, dashboard reading
*paused*, then resolving again after a manual resume. So the client fails at the **transport
layer** and never returns an HTTP status.

The free tier pauses after **~7 days of low activity, measured in incoming API requests**. The
ruling is to stay on it and design around the pause.

**What breaks, traced rather than assumed:** `lib/supabase/server.ts` is imported at runtime by
exactly one module, `lib/rag/retrieve.ts`, reached only from `/api/ask`. Everything engine-driven —
`/timeline`, `/api/timeline`, `/birth`, item pages, share links, and F5 ICS by construction —
survives, because the engine reads `data/rules/*.yaml` from disk and the profile from localStorage.

## Decision

1. **Detect it specifically.** `DatabaseUnreachableError` is raised only by the Supabase wrappers,
   when `isUnreachableError` matches a transport-level signature. `/api/ask` branches on
   `instanceof` and returns **503 `database_unavailable`**, separate from the generic refusal.
2. **Say nothing we cannot keep.** The message promises **no recovery time**: *"Answering questions
   is temporarily unavailable. Your timeline, your dates and everything saved on this phone still
   work. Please try again later."* No "waking up", no ETA, no implication of self-healing —
   recovery is manual. Same discipline as the deadline copy: never soften, never dramatise.
3. **Three distinguishable failures**, so a tester who hit the daily limit is never told our
   infrastructure failed: **429** rate-limited · **503** database unreachable · generic broken.
4. **Alert by log**, at error level, carrying what was **observed** and not what it means — plus
   Vercel's own error surfacing. No new dependency.

## The textual signatures are indistinguishable; the separation is structural

`embedQuestion` calls OpenAI with a raw `fetch` and throws the **identical** `TypeError: fetch
failed`, inside the same `retrieve()` call the route wraps. Anthropic is the same. Matching those
strings anywhere outside the Supabase client would report "database unreachable" for a **model**
outage — ADR-067's swallowed error rebuilt in a new place.

So `isUnreachableError` is only ever reached through the Supabase wrappers, and the route branches
on the typed error, never on a string. The regression test that matters is the one where `retrieve`
throws a plain `TypeError: fetch failed` and the route must **not** call it a database outage.

## Three caveats, kept rather than smoothed

- **One observation.** NXDOMAIN is what *this* pause looked like. The predicate is therefore wide
  enough for any transport-level unreachability, not only DNS.
- **NXDOMAIN cannot distinguish paused from deleted.** The log states what was seen.
- **A reader being offline looks similar, but is distinguishable** — if they received a response
  from `/api/ask` at all, their connectivity to us is proven, so the failure is ours.

## The circularity, which is the finding worth keeping

Once F6 ships, the **daily cron is itself the activity** that prevents the pause, so this should
stop recurring. But **restore is manual and nothing wakes automatically.** If the project ever does
pause — idle before launch, or the cron broken for a week — the cron's own database call fails, so
**the thing meant to keep it awake cannot wake it.** Prevention is automatic; recovery never is.

**On a keep-alive ping:** Supabase's published terms do not address them either way — checked, and
nothing found. The cron needs no justification because it is a real feature that happens to touch
the database. A synthetic ping existing only to defeat the inactivity timer **is not proposed**,
because it cannot be shown to be permitted.

## Consequence

A pause now produces an honest, specific message instead of "something on our side failed", and an
error-level log that says what was observed. The beta invite carries the matching line: this runs
on free infrastructure. Restore stays a human action, which is a documented operating cost, not a
bug. Tests assert both halves — that the outage is reported correctly, and that the timeline and
`/api/timeline` still answer with no database configured at all.
