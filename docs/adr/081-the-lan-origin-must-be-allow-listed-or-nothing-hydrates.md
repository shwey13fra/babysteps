# ADR-081 — The LAN origin must be allow-listed, or nothing hydrates

**Date:** 2026-11-15 · **Status:** accepted · **Human ruling:** approved, via env var, unset by default

## Context

The A3 device check opened `http://192.168.0.26:3000/item/standesamt_birth_registration` and saw
**"Working out your date…" forever, and no buttons anywhere on the page** — not "Add to calendar",
not even "Mark this done".

`next dev` blocks cross-origin requests for its own dev resources from any host it was not told
about. **The failure is invisible from the server side**: the document returns `200`, the HTML
renders in full, the server log shows a healthy `GET … 200 in 55ms`. What does not happen is
hydration — so every client island sits in its initial state permanently, which for `ItemDates` is
the loading text.

Three things made it hard to see, and they are the reason this is written down:

- The page **looked** fine. Server-rendered content is most of an item page.
- The only signal was a `⚠ Blocked cross-origin request` line in the dev server's own output —
  which had been lost to a reaped shell until ADR-078's log redirect was in place **that same
  hour**. Without it the diagnosis would have been guesswork.
- The decisive evidence was the **absence of any `POST /api/timeline` in the log**, plus zero
  `<button>` elements on the page. One island failing is a feature bug; every island failing is the
  origin.

## Decision

`next.config.ts` reads **`DEV_LAN_ORIGIN`** and, only when it is set, passes it as
`allowedDevOrigins`.

- **Unset by default.** Production is untouched; the key is read by the dev server and nothing else.
- **From the environment, never a literal.** The value is a home LAN address, and CLAUDE.md's
  "Never do" list forbids it appearing in this repo. `.env.example` documents it as local-only and
  says why.

## Alternatives rejected

- **Hard-coding the address in `next.config.ts`** — puts a home LAN address in a repo that goes
  public at Stage G, permanently and unrotatably.
- **Testing only over `localhost`** — works, and is what unblocked the device check on the day, but
  it cannot reach **Stage F**, which is a gate: the cold-load measurement has to be taken on a real
  phone over mobile data, and a phone can only reach this machine by its LAN address.

## Consequence

Phone testing works. **A gate was within one step of being measured wrong rather than not at all:**
had Stage F run before this was understood, a cold-load figure taken on an unhydrated page would
have looked *fast* — the document renders, the islands never start, and the number would have been
a measurement of a page that does not work. That is the second time in two days a check has been
caught on its way to failing open (rule 16), and the first in which the failure would have produced
a *better* number than the truth.
