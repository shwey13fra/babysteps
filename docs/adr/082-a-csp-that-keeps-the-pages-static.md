# ADR-082 — A CSP that keeps the pages static

**Date:** 2026-11-15 · **Status:** accepted, with a stated trigger to revisit · **Stage D**

## Context

brief §4 requires "a strict CSP" alongside HSTS, `X-Content-Type-Options`, `Referrer-Policy` and
`frame-ancestors 'none'`. The headers are uncontroversial. The CSP is not, because Next offers two
incompatible shapes and the choice is an architectural one.

Next's own guide leads with a **nonce-based** policy generated in `proxy.ts`, and is explicit about
the cost: *to use a nonce, the page must be dynamically rendered*, because Next injects nonces
during server rendering and a statically generated page has no request to read.

**Every user-facing route in this product is static or SSG** — `/`, `/intake`, `/timeline`,
`/birth`, `/ask`, `/how-it-works`, and twelve prerendered `/item/[id]` pages. Only the API routes,
`/share/[token]` and `/dev/timeline` are dynamic. A nonce CSP would convert the entire product from
edge-cached HTML to a function invocation per navigation.

**Stage F is a gate with a stated bar on cold load, and it has not been measured yet.** Spending
that budget before anyone has seen the number is the wrong order of operations.

## Decision

A **static CSP in `next.config.ts` headers**, strict in every directive except `script-src`, which
carries `'unsafe-inline'`:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none';
base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none';
manifest-src 'self'; upgrade-insecure-requests
```

Development adds `'unsafe-eval'` (React rebuilds server error stacks in the browser) and `ws:` for
HMR. Neither reaches production.

**What `'unsafe-inline'` costs, stated rather than waved past:** an inline `<script>` injected into
our HTML would execute. What makes that acceptable *for this application specifically*:

- **There is no HTML-injection vector.** No `dangerouslySetInnerHTML` anywhere, no user-generated
  markup, no third-party scripts, no tag manager or ads. React escapes everything it renders.
- **Model output is rendered from the zod `Answer` contract as text**, never as markup (rule 8).
- `font-src 'self'` makes CLAUDE.md's "never fetch a font from a Google domain" a
  browser-enforced rule rather than a convention.
- `connect-src 'self'` holds because Supabase and Anthropic are reached from the server only.

`style-src` needs `'unsafe-inline'` for a different and unavoidable reason: React renders the
`style={{…}}` prop as a style attribute, which CSP governs under `style-src`. Inline styles cannot
execute script.

## The trigger to revisit, which is the point of writing this down

**The premise is tested, not trusted.** `tests/security/posture.test.ts` asserts that
`dangerouslySetInnerHTML` and dynamic evaluation appear nowhere in `app/` or `lib/`, that no client
component imports the service-role client, and that `NEXT_PUBLIC_` names stay inside the allow-list
— each with a negative control proving the matcher can fail, and a denominator assertion so the
suite cannot pass over an empty file list.

**Move to nonces when any of these becomes true:** markup is rendered from data, a third-party
script is added, or Stage F shows the cold-load budget can absorb dynamic rendering. The first two
are failures of this ADR's premise; the third is simply better information.

## Also decided here

- **`X-Robots-Tag: noindex, nofollow` on every route.** The beta is not for search engines. Lifting
  it is a deliberate Stage G act, not a default.
- **`Permissions-Policy` denies twelve features the product never uses** — camera, microphone,
  geolocation and the rest — so a compromised dependency cannot start asking a pregnant user for
  her location.
- **`Referrer-Policy: strict-origin-when-cross-origin`.** A share link carries an HMAC-signed
  profile in its path; a full referrer would hand a family's answers to whatever they click
  through to.

## Verified, not assumed

Checked against a **production build**, because the development policy is deliberately looser:
every route carries all ten headers; `/dev/timeline` returns **404**; fonts load 4 of 4;
the stylesheet applies; client islands hydrate; and the **blob download path in
`add-to-calendar.tsx` works end to end** — 1,862 bytes of valid iCalendar — which is the feature a
strict CSP was most likely to break silently.

One scare worth recording: a probe reported a missing script chunk. It carried `nomodule`, which
modern browsers skip by design. **The probe was wrong, not the policy** — the third time this week
that a measuring instrument, not the product, was the defect.
