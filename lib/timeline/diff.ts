// lib/timeline/diff.ts
//
// F2b: what moved when the birth date landed.
//
// This is the engine half of the screen the addendum calls the most
// screenshot-worthy interaction in the build — and it doubles as a self-check,
// because a date moving in a direction that makes no sense is visible to the
// user before it is visible to us. Engine only; no UI in this phase.

import type { IntakeProfile, TimelineItem } from "../schemas";
import type { ISODate } from "./dates";
import { buildTimeline } from "./index";

export type DateChange = {
  id: string;
  title: string;
  from: ISODate;
  to: ISODate;
};

/**
 * The date a user thinks of as "the date for this item": its deadline when it has
 * one, otherwise the day its window opens. Both offsets hang off the same anchor,
 * so when the anchor moves they move together by the same number of days.
 */
function keyDate(item: TimelineItem): ISODate {
  return item.deadline?.date ?? item.window_open;
}

/**
 * Items whose date moved between two profiles.
 *
 * Both timelines are derived against the same `today` so that a status change
 * cannot masquerade as a date change. Items that appear or disappear between the
 * two profiles are not reported: this answers "what moved", not "what changed".
 */
export function computeDateChanges(
  before: IntakeProfile,
  after: IntakeProfile,
  options: { today?: ISODate } = {},
): DateChange[] {
  const opts = options.today !== undefined ? { today: options.today } : {};
  const beforeItems = new Map(buildTimeline(before, opts).items.map((i) => [i.id, i]));

  const changes: DateChange[] = [];
  for (const item of buildTimeline(after, opts).items) {
    const prev = beforeItems.get(item.id);
    if (prev === undefined) continue;

    const from = keyDate(prev);
    const to = keyDate(item);
    if (from !== to) changes.push({ id: item.id, title: item.title_en, from, to });
  }

  return changes;
}
