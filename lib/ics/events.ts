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

import type { TimelineItem } from "../schemas";
import { keyDate } from "../timeline/key-date";
import { anchorLine, asOfLabel, deadlineKindLine } from "../ui/item-view";
import type { IcsEvent } from "./calendar";

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
export function eventDescription(item: TimelineItem, siteUrl: string): string {
  const parts: string[] = [];

  parts.push(item.consequence_en);

  // Rule 12, from the single shared implementation.
  const kind = item.deadline
    ? deadlineKindLine(item.deadline.kind, item.authority_en, item.deadline.note_en)
    : null;
  if (kind) parts.push(`${kind.label}. ${kind.text}`);

  // The honesty the playbook names explicitly for F5: an estimated date must
  // say it is estimated, and offer the one action that makes it exact.
  if (item.certainty === "estimated") {
    parts.push(
      `This date is ${anchorLine(item.anchor, item.certainty).toLowerCase()}. ` +
        `It will move when the birth is recorded: ${siteUrl}/birth`,
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

  return parts.join("\n\n");
}

/** The summary line. The German term rides along where there is one. */
export function eventSummary(item: TimelineItem): string {
  return item.term_de && !item.title_en.includes(item.term_de)
    ? `${item.title_en} (${item.term_de})`
    : item.title_en;
}

/**
 * Every item as a calendar entry, in the engine's own order.
 *
 * `keyDate` is the same function the gutter renders from, so a calendar entry
 * and the screen can never disagree about which date an item falls on —
 * ADR-075 was exactly that disagreement in a different place.
 */
export function toEvents(items: readonly TimelineItem[], siteUrl: string): IcsEvent[] {
  return items.map((item) => ({
    uid: eventUid(item.id),
    date: keyDate(item),
    summary: eventSummary(item),
    description: eventDescription(item, siteUrl),
    url: `${siteUrl}/item/${item.id}`,
  }));
}
