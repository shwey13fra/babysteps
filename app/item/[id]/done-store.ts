"use client";

// Whether THIS item is marked done, for the two islands on an item page.
//
// Extracted rather than duplicated (CLAUDE.md rule 1, the 2026-11-04 exception):
// ./done-toggle.tsx needs it to label the control, and ./dates.tsx needs it to
// decide whether to show a countdown chip. Two copies of a localStorage
// subscription would be two chances for the page to disagree with itself about
// the same fact — which is the defect that put this file here. The screenshot
// showed the item page saying "Marked done" in grey and "was due 163 days ago"
// in red, six lines apart.
//
// useSyncExternalStore, not useEffect + setState: localStorage is an external
// store read during render, and setting state synchronously in an effect fires a
// cascading render on every mount. The `storage` event comes free with it, so a
// mark made in another tab arrives here without this file knowing about tabs.

import { useCallback, useSyncExternalStore } from "react";
import { readProfile } from "@/lib/ui/profile-store";

/**
 * A primitive, because getSnapshot runs on every render and React compares its
 * result by identity.
 *
 * 'absent' is both "no profile in this browser" and the server snapshot. It is
 * not the same as "not done": with no profile there is nothing to mark, and the
 * prerendered HTML must not show a control whose label would change under the
 * reader a tick later.
 */
export type DoneState = "absent" | "done" | "open";

const listeners = new Set<() => void>();

/** Our own writes. The browser raises `storage` for other tabs, never this one. */
export function notifyDoneChanged(): void {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useDoneState(id: string): DoneState {
  return useSyncExternalStore<DoneState>(
    subscribe,
    useCallback(() => {
      const stored = readProfile();
      if (!stored) return "absent";
      return stored.completed.includes(id) ? "done" : "open";
    }, [id]),
    () => "absent",
  );
}
