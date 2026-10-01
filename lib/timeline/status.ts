// lib/timeline/status.ts
//
// Status is the only part of the engine that depends on "now", so `today` is
// always passed in. Nothing here reads the clock.

import type { ISODate } from "./dates";
import { diffDays } from "./dates";
import type { ItemStatus } from "../schemas";

/** design-system.md §5: the amber chip appears at deadline − 14. */
export const URGENT_WINDOW_DAYS = 14;

/**
 * Precedence, highest first: overdue → upcoming → urgent → current → past.
 *
 * - overdue   deadline is behind us
 * - upcoming  the window has not opened yet
 * - urgent    window open and deadline 0..14 days away (inclusive at exactly 14)
 * - current   window open, no deadline close
 * - past      the window opened and closed with no deadline to miss
 *
 * 'upcoming' deliberately outranks 'urgent'. Standesamt registration opens at the
 * birth and is due seven days later, so a deadline-first ordering would put an
 * amber "7 days left" chip on it a week before the baby is born — alarming a
 * pregnant person about a deadline she cannot yet act on, against the
 * design-system rule that amber means a real deadline inside fourteen days.
 *
 * 'overdue' still outranks everything, because an item can be overdue on its
 * first ever render: a baby born three weeks early moves the Standesamt deadline
 * into the past before the user has seen it. Normal state, not an edge case
 * (addendum §1).
 */
export function deriveStatus(
  today: ISODate,
  windowOpen: ISODate,
  deadline: ISODate | undefined,
): ItemStatus {
  const daysLeft = deadline === undefined ? undefined : diffDays(today, deadline);
  if (daysLeft !== undefined && daysLeft < 0) return "overdue";

  const daysSinceOpen = diffDays(windowOpen, today);
  if (daysSinceOpen < 0) return "upcoming";

  if (daysLeft !== undefined) {
    return daysLeft <= URGENT_WINDOW_DAYS ? "urgent" : "current";
  }

  // No deadline: open on the day the window opens, then it just sits in the past
  // with "check if done" guidance (PRD §5).
  return daysSinceOpen === 0 ? "current" : "past";
}
