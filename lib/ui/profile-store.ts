// lib/ui/profile-store.ts
//
// The intake profile, in this browser only.
//
// PRD §8: no account required, intake answers stored client-side under an
// anonymous ID. Nothing here is sent anywhere except as the body of a
// POST /api/timeline, which is not logged against the id (ADR-069).
//
// Everything is defensive by default. localStorage can be unavailable (private
// mode, blocked site data, a browser that throws on access), it can hold a
// shape written by an older version of this app, and it can hold something a
// user pasted in by hand. A stale key must never crash the timeline - it must
// look exactly like "no profile yet", which routes to intake.

import { IntakeProfile } from "../schemas";
import type { IntakeProfile as Profile } from "../schemas";

/**
 * Versioned, so a future schema change can be detected rather than guessed at.
 * A v1 key that no longer parses is discarded, not migrated in place.
 */
const KEY = "babysteps.profile.v1";

export type StoredProfile = {
  /** Anonymous, generated once in this browser. Never sent to a server. */
  id: string;
  profile: Profile;
  saved_at: string;
};

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    // Touch it: Safari in private mode throws only on use, not on access.
    const probe = "__babysteps_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** Crypto-grade where available; a plain fallback where it is not. */
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The stored profile, or null.
 *
 * Returns null for every failure mode - absent, unparseable JSON, a shape the
 * current schema rejects, storage unavailable - because the caller's response is
 * the same in all of them: send the user to intake. The distinction matters for
 * nothing except diagnostics, and diagnostics here would mean logging a profile.
 */
export function readProfile(): StoredProfile | null {
  const s = storage();
  if (!s) return null;

  let raw: string | null;
  try {
    raw = s.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  const profile = IntakeProfile.safeParse(record.profile);
  if (!profile.success) return null;

  return {
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : newId(),
    profile: profile.data,
    saved_at: typeof record.saved_at === "string" ? record.saved_at : new Date().toISOString(),
  };
}

/**
 * Persists a profile, keeping the existing anonymous id if there is one.
 *
 * Returns the stored record on success and null when storage is unavailable, so
 * a caller can tell the user their answers were not kept rather than pretending
 * they were. Validates before writing: an invalid profile in localStorage would
 * be read back as "no profile" and silently send the user through intake again.
 */
export function writeProfile(profile: Profile): StoredProfile | null {
  const valid = IntakeProfile.safeParse(profile);
  if (!valid.success) return null;

  const s = storage();
  if (!s) return null;

  const existing = readProfile();
  const record: StoredProfile = {
    id: existing?.id ?? newId(),
    profile: valid.data,
    saved_at: new Date().toISOString(),
  };

  try {
    s.setItem(KEY, JSON.stringify(record));
  } catch {
    return null;
  }
  return record;
}

/** Used by the intake flow when a user starts over. */
export function clearProfile(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* nothing to do: the caller's next read returns null either way */
  }
}

/** True when this browser can keep answers at all. Drives an honest warning. */
export function storageAvailable(): boolean {
  return storage() !== null;
}
