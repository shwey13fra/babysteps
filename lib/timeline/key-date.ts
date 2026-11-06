// lib/timeline/key-date.ts
//
// One definition of "the date for this item", in a module with NO runtime
// imports.
//
// It lived in diff.ts until Phase 6 stage B. That file imports `buildTimeline`
// at runtime, which reaches loadRules and therefore `node:fs` - so a client
// component importing keyDate from there would have pulled the whole engine and
// the rules loader into the browser bundle, which is exactly what ADR-069 says
// must never happen. Both imports below are `import type`, erased at compile
// time, so this module is safe on either side of the wire.

import type { TimelineItem } from "../schemas";
import type { ISODate } from "./dates";

/**
 * The date a user thinks of as "the date for this item": its deadline when it
 * has one, otherwise the day its window opens. Both offsets hang off the same
 * anchor, so when the anchor moves they move together by the same number of
 * days.
 *
 * Two readers, one definition: `computeDateChanges` reports what moved, and the
 * timeline screen's date gutter shows where a row sits. If those disagreed, the
 * birth diff would list "22 Nov → 16 Nov" for a row the timeline had labelled
 * some other day — the one screen whose job is to prove the product works would
 * contradict the screen beside it.
 */
export function keyDate(item: TimelineItem): ISODate {
  return item.deadline?.date ?? item.window_open;
}
