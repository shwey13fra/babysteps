# ADR-071 — The share link is signed, not stored

Date: 2026-11-06 · Code: `lib/share/token.ts`, `app/share/[token]/`, `app/api/share/route.ts`

Context: F7 wants a read-only timeline a partner can open. The obvious design is a row in a table
and a short id in the URL. This product has no such table on purpose — PRD §8 keeps intake answers
client-side under an anonymous id, and the schema holds "no personal data beyond an opt-in e-mail".

Decision: the link carries its own payload, HMAC-signed. `<base64url(payload)>.<base64url(hmac)>`,
the payload a versioned JSON object holding the profile and when it was issued. The server stores
nothing and learns nothing; the signature is what makes the dates trustworthy.

- **Signed, not encrypted, and the tests say so.** Whoever holds the link can read the profile
  inside it — that is the person it was made for. What the signature buys is that they cannot
  ALTER it: a partner cannot edit a due date or a Bundesland and have the timeline agree.
- **Version first**, so a v1 reader refuses a v2 token outright rather than guessing at fields.
- **The profile is re-validated after the signature checks out.** A signature proves we issued the
  bytes, not that they still parse; a token minted before a schema change is refused, not fed to
  the engine.
- **Constant-time comparison**, with the length checked first because `timingSafeEqual` throws on a
  mismatch. A plain `===` on an HMAC leaks how much of a forged signature was right.
- **Every failure reads the same to the visitor.** Naming which part of a token was wrong is free
  help to anyone forging one, and a legitimate visitor could do nothing with the detail.
- **No secret configured is a 503, never an unsigned token.** That is a deployment state, not a
  user error.
- The shared view is server-rendered and **does not link into item pages**: those work out their
  date from the READER's profile, which a partner does not have.

Alternative: a stored row with an opaque id. Rejected — it would put a real person's timeline in a
table that currently holds nobody, to save a few hundred bytes of URL.

Consequence, stated because it is a real limit. The "this view predates the birth" banner compares
the token against a profile in the VIEWER's browser, so it can only fire on a device that has done
intake. It catches the owner re-opening their own stale link; it cannot fire on the partner's
phone, which is the case it was wanted for. Making it work there would mean the server keeping a
record of the owner — the trade this ADR exists to refuse. The banner is honest about what it
knows, and the shared view says plainly that it does not update on its own.
