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
// Moved out on 2026-11-18 when the landing became the second caller. See
// lib/ui/storage.ts — the probe is shared, never copied (CLAUDE.md rule 1).
import { storage } from "./storage";

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
  /**
   * Item ids the parent has marked done. ADR-072.
   *
   * Deliberately NOT a field of `IntakeProfile`. IntakeProfile is the POST body
   * of /api/timeline and the engine's input, and "done" is neither: the engine
   * derives status from dates and knows nothing about what a reader has
   * finished. Keeping it one level out means `deriveStatus` stays untouched and
   * the rules schema and the eval harness never see a presentation flag.
   *
   * Ids are stored, not booleans per item, so a rule that is later renamed or
   * removed leaves a harmless orphan rather than a mismatched record.
   */
  completed: string[];
};

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
    completed: readCompleted(record.completed),
  };
}

/**
 * The completed-item ids, from whatever is in storage.
 *
 * Absent (every record written before ADR-072), not an array, or holding
 * non-strings all mean the same thing: nothing is marked done. A bad `completed`
 * must never cost the reader their profile, because the timeline is the product
 * and the grey treatment is a convenience.
 */
function readCompleted(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return [...new Set(ids)];
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
  const s = storage();
  if (!s) return null;

  const existing = readProfile();

  // When the parent told us the birth date. Provenance, not a timeline date:
  // the product says where every date came from, including the ones the user
  // gave it, the same way a citation carries its as-of (ruling 2026-11-14).
  //
  // Stamped when birth_date first appears AND when it changes, because a
  // corrected date was recorded at the moment of the correction, not of the
  // original mistake. Cleared with the birth date, so the pair is never
  // half-present. The engine never reads it - it is not an anchor.
  const previousBirth = existing?.profile.birth_date;
  const nextBirth = profile.birth_date;
  const recordedAt =
    nextBirth === undefined
      ? undefined
      : nextBirth === previousBirth
        ? (existing?.profile.birth_recorded_at ?? new Date().toISOString())
        : new Date().toISOString();

  // Validated AFTER the stamp is attached, so an invalid timestamp can never
  // reach storage: a bad record reads back as "no profile" and would silently
  // send the parent through intake again.
  const valid = IntakeProfile.safeParse({ ...profile, birth_recorded_at: recordedAt });
  if (!valid.success) return null;

  const record: StoredProfile = {
    id: existing?.id ?? newId(),
    profile: valid.data,
    saved_at: new Date().toISOString(),
    // Answers can be corrected without un-finishing the steps already done:
    // recording the birth rewrites the profile, and it would be a poor product
    // that cleared the checkmarks as a side effect.
    completed: existing?.completed ?? [],
  };

  try {
    s.setItem(KEY, JSON.stringify(record));
  } catch {
    return null;
  }
  return record;
}

/**
 * Marks an item done, or undoes it. ADR-072.
 *
 * Returns the stored record, or null when there is nothing to mark (no profile
 * yet) or storage will not keep it — so a caller can tell the reader their tap
 * was not kept rather than showing a checkmark that disappears on reload.
 *
 * Reversible by design: this is a self-reported checkmark on a legal deadline,
 * and the parent must be able to take it back. There is no confirm step, because
 * the action is already undoable in one tap.
 */
export function setItemDone(id: string, done: boolean): StoredProfile | null {
  if (id.length === 0) return null;

  const existing = readProfile();
  if (!existing) return null;

  const s = storage();
  if (!s) return null;

  const completed = done
    ? [...new Set([...existing.completed, id])]
    : existing.completed.filter((c) => c !== id);

  const record: StoredProfile = { ...existing, completed };
  try {
    s.setItem(KEY, JSON.stringify(record));
  } catch {
    return null;
  }
  return record;
}

/** Whether this item is marked done in this browser. */
export function isItemDone(id: string): boolean {
  return readProfile()?.completed.includes(id) ?? false;
}

/** Used by the intake flow when a user starts over. */
export function clearProfile(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* nothing to do: the caller's next read returns null either way */
  }
}

/**
 * True when this browser can keep answers at all. Drives an honest warning.
 *
 * Re-exported from lib/ui/storage.ts rather than redefined, so the existing
 * `import { storageAvailable } from "@/lib/ui/profile-store"` in app/intake
 * keeps working and there is still only one probe in the codebase.
 */
export { storageAvailable } from "./storage";
