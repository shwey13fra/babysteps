// lib/timeline/index.ts
//
// The engine's one public entry point. The debug page, the API route and the
// Phase 6 UI all call buildTimeline — that shared call is what makes the Phase 6
// regression test ("screen dates equal engine dates") mean anything.
//
// Rule 4: the LLM never computes dates. Everything here is arithmetic.

import type { IntakeProfile, TimelineItem, TimelinePeriod } from "../schemas";
import type { ISODate } from "./dates";
import { addDays, diffDays, todayISO } from "./dates";
import { inScope } from "./applies";
import { computeMutterschutz } from "./mutterschutz";
import type { Rule } from "./rules";
import { loadRules } from "./rules";
import { deriveStatus } from "./status";

export type Timeline = {
  items: TimelineItem[];
  period: TimelinePeriod;
  /** The date every status was derived against. Echoed so output is reproducible. */
  as_of: ISODate;
};

export type BuildOptions = {
  /** Pin "today". Tests must pass this; production passes nothing. */
  today?: ISODate;
  /** Inject rules instead of reading data/rules/. Used by fixtures. */
  rules?: Rule[];
};

/**
 * Which date a rule counts from.
 *
 * A birth-anchored rule with no birth_date counts from the due date as a
 * placeholder and the item is marked 'estimated'. This is the single line the
 * addendum calls out, and the reason the product is honest about not knowing.
 */
function anchorDate(rule: Rule, profile: IntakeProfile): { from: ISODate; confirmed: boolean } {
  if (rule.anchor === "due_date") return { from: profile.due_date, confirmed: true };
  if (profile.birth_date !== undefined) return { from: profile.birth_date, confirmed: true };
  return { from: profile.due_date, confirmed: false };
}

function toItem(rule: Rule, profile: IntakeProfile, today: ISODate): TimelineItem {
  const { from, confirmed } = anchorDate(rule, profile);

  const window_open = addDays(from, rule.window_open.offset_days);
  const deadlineDate =
    rule.deadline === undefined ? undefined : addDays(from, rule.deadline.offset_days);

  return {
    id: rule.id,
    title_en: rule.title_en,
    ...(rule.term_de !== undefined ? { term_de: rule.term_de } : {}),
    track: rule.track,
    jurisdiction: rule.jurisdiction,
    anchor: rule.anchor,
    certainty: confirmed ? "confirmed" : "estimated",
    status: deriveStatus(today, window_open, deadlineDate),
    window_open,
    ...(rule.deadline !== undefined && deadlineDate !== undefined
      ? {
          deadline: {
            date: deadlineDate,
            kind: rule.deadline.kind,
            ...(rule.deadline.note_en !== undefined ? { note_en: rule.deadline.note_en } : {}),
          },
          days_until_deadline: diffDays(today, deadlineDate),
        }
      : {}),
    authority_en: rule.authority_en,
    ...(rule.authority_local !== undefined ? { authority_local: rule.authority_local } : {}),
    consequence_en: rule.consequence_en,
    documents: rule.documents,
    source_ref: rule.source_ref,
    source_url: rule.source_url,
    verified_on: rule.verified_on,
    ...(rule.source_status !== undefined ? { source_status: rule.source_status } : {}),
    review_after: rule.review_after,
  };
}

/** Stable sort by window_open, then by id so equal dates never reorder between runs. */
function byWindowThenId(a: TimelineItem, b: TimelineItem): number {
  return a.window_open === b.window_open
    ? a.id.localeCompare(b.id)
    : diffDays(b.window_open, a.window_open) > 0
      ? 1
      : -1;
}

export function buildTimeline(profile: IntakeProfile, options: BuildOptions = {}): Timeline {
  const today = options.today ?? todayISO();
  const rules = options.rules ?? loadRules();

  const items = rules
    .filter((r) => inScope(r, profile))
    .map((r) => toItem(r, profile, today))
    .sort(byWindowThenId);

  return { items, period: computeMutterschutz(profile), as_of: today };
}

export { computeDateChanges } from "./diff";
export type { DateChange } from "./diff";
