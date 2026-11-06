// lib/share/token.ts
//
// The partner share link. SERVER ONLY - this module reads the signing secret
// and must never be imported from a client component.
//
// A share link is a read-only snapshot of a profile, signed so it cannot be
// edited by whoever holds the URL. It is NOT a capability to anything else:
// there is no account to escalate to, no write path, and the payload carries
// only what the timeline needs to draw.
//
// SHAPE. `<base64url(payload)>.<base64url(hmac)>`, the payload a versioned JSON
// object. Version first so a future change can be rejected rather than
// misparsed: a v1 reader must refuse a v2 token outright instead of guessing at
// fields it does not know.
//
// WHAT THIS IS NOT. The payload is signed, not encrypted - anyone holding the
// link can read the profile inside it, which is the point, since the person
// holding it is the partner it was made for. The signature stops it being
// ALTERED, so a recipient cannot change a due date or a Bundesland and have the
// timeline believe them.

import { createHmac, timingSafeEqual } from "node:crypto";
import { IntakeProfile } from "../schemas";
import type { IntakeProfile as Profile } from "../schemas";

export const SHARE_TOKEN_VERSION = 1;

/** The env var is already declared in .env.example. */
const SECRET_ENV = "SHARE_LINK_HMAC_SECRET";

export type SharePayload = {
  v: number;
  profile: Profile;
  /** When the link was made. Shown to the viewer so a stale link is visible. */
  issued_at: string;
};

export type VerifyResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; reason: "no_secret" | "malformed" | "bad_signature" | "wrong_version" | "bad_profile" };

function secret(): string | null {
  const value = process.env[SECRET_ENV];
  return value && value.length > 0 ? value : null;
}

const b64url = (buf: Buffer | string) =>
  (Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "utf8")).toString("base64url");

function sign(body: string, key: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

/**
 * Signs a profile into a share token, or null when no secret is configured.
 *
 * Returning null rather than throwing lets the route answer 503 and the screen
 * say sharing is unavailable - a missing secret is a deployment state, not a
 * user error, and it must never produce an UNSIGNED token.
 */
export function createShareToken(profile: Profile, issuedAt: string): string | null {
  const key = secret();
  if (!key) return null;

  const payload: SharePayload = { v: SHARE_TOKEN_VERSION, profile, issued_at: issuedAt };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, key)}`;
}

/**
 * Verifies and decodes a token.
 *
 * The signature is checked BEFORE the payload is trusted for anything, and with
 * a constant-time comparison: a plain `===` on an HMAC leaks how much of a
 * forged signature was right, one byte at a time.
 *
 * The profile inside is then re-validated against IntakeProfile. A signature
 * only proves we issued the bytes; it does not prove they still parse, and a
 * token signed before a schema change must be refused rather than fed to the
 * engine.
 */
export function verifyShareToken(token: string): VerifyResult {
  const key = secret();
  if (!key) return { ok: false, reason: "no_secret" };

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [body, signature] = parts;

  const expected = Buffer.from(sign(body, key), "utf8");
  const given = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, which is itself a signal, so
  // the lengths are compared first and both paths return the same reason.
  if (expected.length !== given.length) return { ok: false, reason: "bad_signature" };
  if (!timingSafeEqual(expected, given)) return { ok: false, reason: "bad_signature" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof parsed !== "object" || parsed === null) return { ok: false, reason: "malformed" };
  const record = parsed as Record<string, unknown>;

  if (record.v !== SHARE_TOKEN_VERSION) return { ok: false, reason: "wrong_version" };

  // IntakeProfile.safeParse can throw on a malformed date (see the note in
  // app/api/timeline/route.ts), and this input is attacker-influenced, so it is
  // wrapped rather than trusted to behave.
  let profile;
  try {
    profile = IntakeProfile.safeParse(record.profile);
  } catch {
    return { ok: false, reason: "bad_profile" };
  }
  if (!profile.success) return { ok: false, reason: "bad_profile" };

  return {
    ok: true,
    payload: {
      v: SHARE_TOKEN_VERSION,
      profile: profile.data,
      issued_at: typeof record.issued_at === "string" ? record.issued_at : "",
    },
  };
}

/** True when sharing can work at all. Drives an honest "unavailable" message. */
export function sharingConfigured(): boolean {
  return secret() !== null;
}
