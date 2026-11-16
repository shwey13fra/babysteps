// lib/ics/events.ts
//
// TimelineItem -> IcsEvent. The engine decides every date (CLAUDE.md rule 4);
// this file decides only what a calendar entry SAYS.
//
// Three rules from CLAUDE.md are load-bearing here, because an .ics leaves the
// building and gets read months later with none of our UI around it:
//
//   Rule 12, deadline honesty. An advisory date must never read as statutory.
//   The kind line is not rewritten here - `deadlineKindLine` is imported, so
//   the sentence a parent reads on paper, on screen and in their calendar is
//   produced by one function.
//
//   Rule 13, no individual case assessment. Nothing below states an
//   entitlement, an amount or an outcome. It states the rule and names who
//   decides, which is what `deadlineKindLine` already does.
//
//   Provenance. Every event carries its source and its as-of, or the admission
//   that nobody has checked it - the same promise the item page makes.

import type { Bundesland, TimelineItem } from "../schemas";
import { diffDays } from "../timeline/dates";
import { keyDate } from "../timeline/key-date";
import { anchorLine, asOfLabel, closedDayLine, deadlineKindLine } from "../ui/item-view";
import type { IcsAlarm, IcsEvent } from "./calendar";

/**
 * Stable per item and per calendar, so re-importing after a birth is recorded
 * UPDATES the entry rather than adding a second one beside it.
 *
 * Deliberately NOT derived from the date. A UID containing the date would make
 * every moved deadline a new event, which is the behaviour this product must
 * not have: recording a birth moves six dates at once (ADR-070).
 */
export function eventUid(itemId: string): string {
  return `${itemId}@babysteps-germany`;
}

/**
 * What the entry says, in the order a parent needs it months from now with no
 * app around it.
 */
export function eventDescription(
  item: TimelineItem,
  siteUrl: string | null,
  bundesland?: Bundesland,
): string {
  const parts: string[] = [];

  parts.push(item.consequence_en);

  // ADR-079. The date is not moved; the entry says what day it is. This matters
  // more here than anywhere else on screen: the calendar entry is read months
  // later with none of our UI around it, and "2 January 2027" in a calendar does
  // not announce that it is a Saturday until the parent has already planned the
  // trip.
  const closed = bundesland ? closedDayLine(keyDate(item), bundesland) : null;
  if (closed) parts.push(closed);

  // Rule 12, from the single shared implementation.
  const kind = item.deadline
    ? deadlineKindLine(item.deadline.kind, item.authority_en, item.deadline.note_en)
    : null;
  if (kind) parts.push(`${kind.label}. ${kind.text}`);

  // The honesty the playbook names explicitly for F5: an estimated date must
  // say it is estimated, and offer the one action that makes it exact.
  // ADR-084. The link is dropped, the sentence is not. A parent reading this
  // months from now still has to know the date is estimated and that recording
  // the birth moves it — that is the honesty F5 requires. What they must not be
  // handed is an address that leads to a login wall, so when there is no origin
  // worth writing down (`siteUrl === null`) the sentence simply ends.
  if (item.certainty === "estimated") {
    const estimated = `This date is ${anchorLine(item.anchor, item.certainty).toLowerCase()}. `;
    parts.push(
      siteUrl
        ? `${estimated}It will move when the birth is recorded: ${siteUrl}/birth`
        : `${estimated}It will move when the birth is recorded.`,
    );
  }

  if (item.documents.length > 0) {
    parts.push(`Take with you: ${item.documents.join("; ")}`);
  }

  // Provenance, including the absence of it.
  parts.push(
    `Source: ${item.source_ref} (${asOfLabel(item.verified_on, item.source_status)}) ${item.source_url}`,
  );

  parts.push(
    "BabySteps is a navigator to official sources — not legal, tax or medical advice. " +
      "The decision in your case always lies with the responsible authority.",
  );

  // Trimmed: rule text comes from YAML block scalars, which leave a trailing
  // newline. Joined untrimmed it produces three newlines between paragraphs,
  // which some clients render as a visible gap in the entry.
  return parts.map((part) => part.trim()).join("\n\n");
}

/** The summary line. The German term rides along where there is one. */
export function eventSummary(item: TimelineItem): string {
  return item.term_de && !item.title_en.includes(item.term_de)
    ? `${item.title_en} (${item.term_de})`
    : item.title_en;
}

/** 09:00, in the parent's own local time. Not 08:00: offices are not open yet. */
const ALARM_HOUR = 9;

/**
 * One alert, at 09:00 on the day the window opens.
 *
 * NOT on the deadline day. `keyDate` is the deadline where there is one, and an
 * alert on the morning of the deadline is a notification that it is already too
 * late to plan. The window-open day is the first day the step can actually be
 * done, which is the day the information is worth having. For an item with no
 * deadline the two dates are the same and the offset is simply +9h.
 *
 * The offset is expressed in hours from DTSTART — midnight local on the event's
 * own date — so the alert lands at 09:00 in the reader's timezone without the
 * file ever naming one. An all-day DTSTART has no timezone to get wrong.
 *
 * WHAT IT SAYS. "Name the thing, no urgency language" (ruling 2026-11-15). The
 * summary, and for an estimated date the fact that it is estimated — an alert
 * that fires confidently on a guessed date is worse than no alert, because it
 * spends the parent's trust on arithmetic we have already told them is
 * provisional. No countdown, no consequence, no exclamation.
 */
export function eventAlarm(item: TimelineItem): IcsAlarm {
  const daysBefore = diffDays(item.window_open, keyDate(item));
  const summary = eventSummary(item);
  return {
    offsetHours: ALARM_HOUR - daysBefore * 24,
    description:
      item.certainty === "estimated"
        ? `${summary} — this date is estimated and will move when the birth is recorded.`
        : summary,
  };
}

/**
 * Every item as a calendar entry, in the engine's own order.
 *
 * `keyDate` is the same function the gutter renders from, so a calendar entry
 * and the screen can never disagree about which date an item falls on —
 * ADR-075 was exactly that disagreement in a different place.
 */
export function toEvents(
  items: readonly TimelineItem[],
  siteUrl: string | null,
  bundesland?: Bundesland,
): IcsEvent[] {
  return items.map((item) => ({
    uid: eventUid(item.id),
    date: keyDate(item),
    summary: eventSummary(item),
    description: eventDescription(item, siteUrl, bundesland),
    // ADR-084: omitted rather than guessed. `url` is optional on IcsEvent and
    // buildCalendar writes no URL line without one, so the entry stays valid.
    ...(siteUrl ? { url: `${siteUrl}/item/${item.id}` } : {}),
    alarm: eventAlarm(item),
  }));
}
