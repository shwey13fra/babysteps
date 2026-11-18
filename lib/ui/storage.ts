// lib/ui/storage.ts
//
// One guarded handle on localStorage, for every client module that wants one.
//
// Extracted from lib/ui/profile-store.ts on 2026-11-18, when the landing's
// "seen once" preference became the second caller. CLAUDE.md rule 1 permits
// moving a helper to keep a module pure; it does not permit copying one, and a
// second hand-rolled private-mode probe is exactly the kind of near-duplicate
// that drifts and then disagrees with itself.
//
// The defensiveness is not decorative. localStorage can be unavailable (private
// mode, blocked site data, a browser that throws on access rather than on use),
// and every caller here runs in a component that must still render when it is.

/**
 * The browser's localStorage, or null when it cannot be used.
 *
 * Writes and removes a probe key rather than merely reading the property:
 * Safari in private mode hands back a Storage object and throws only when
 * something is stored in it, so a presence check alone reports a false pass.
 */
export function storage(): Storage | null {
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

/** Whether anything can be persisted in this browser at all. */
export function storageAvailable(): boolean {
  return storage() !== null;
}
