"use client";

// The one reader of "where does this item fall for this family".
//
// Two islands on this page need the same fact: ItemDates renders the date and
// its chip, AddToCalendar needs the same item to know whether the date is
// estimated. On 2026-11-10 this page already shipped a defect of exactly that
// shape - two islands each correct, the page contradicting itself - and the fix
// then was one reader rather than two careful ones (./done-store.ts, ADR-072).
//
// So the fetch is extracted rather than copied. CLAUDE.md's 2026-11-04 ruling:
// extracting a shared helper is within scope when the alternative is
// duplicating it; duplicating is the scope violation.
//
// The in-flight promise is shared per item id, so two islands mounting together
// produce ONE POST /api/timeline rather than two identical ones.

import { useEffect, useState } from "react";
import { TimelineResponse } from "@/lib/schemas";
import type { IntakeProfile, TimelineItem } from "@/lib/schemas";
import { readProfile } from "@/lib/ui/profile-store";

export type ItemState =
  | { phase: "loading" }
  /** No profile in this browser: the reader has not done intake here. */
  | { phase: "none" }
  /** The rule exists, but is out of scope for these answers. */
  | { phase: "not-in-timeline" }
  | { phase: "ready"; item: TimelineItem; profile: IntakeProfile }
  | { phase: "failed" };

const inflight = new Map<string, Promise<ItemState>>();

async function load(id: string): Promise<ItemState> {
  const stored = readProfile();
  if (!stored) return { phase: "none" };

  try {
    const res = await fetch("/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stored.profile),
      cache: "no-store",
    });
    if (!res.ok) return { phase: "failed" };

    const parsed = TimelineResponse.safeParse(await res.json());
    if (!parsed.success) return { phase: "failed" };

    const item = parsed.data.items.find((i) => i.id === id);
    if (!item) return { phase: "not-in-timeline" };

    return { phase: "ready", item, profile: stored.profile };
  } catch {
    return { phase: "failed" };
  }
}

/** Shared per id for the life of the page, so the two islands cannot diverge. */
export function loadItemState(id: string): Promise<ItemState> {
  const existing = inflight.get(id);
  if (existing) return existing;
  const promise = load(id);
  inflight.set(id, promise);
  return promise;
}

export function useItemState(id: string): ItemState {
  const [state, setState] = useState<ItemState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    void loadItemState(id).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
