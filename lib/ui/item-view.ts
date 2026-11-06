// lib/ui/item-view.ts
//
// The item page, as data. Pure; no React, no fs.
//
// The load-bearing part of this file is `deadlineKindLine`. CLAUDE.md rule 12:
// a deadline whose rule file says kind: soft or advisory must NEVER be described
// anywhere - UI, answer, e-mail - as a legal or statutory deadline. This is the
// one place the UI says what kind of deadline an item carries, so it is the one
// place that rule can be broken on screen, and tests/ui/item-view.test.ts asserts
// the forbidden vocabulary never appears for the two soft kinds.

import type { DeadlineKind } from "../schemas";

export type KindLine = {
  /** The sentence under the sources. */
  text: string;
  /** Short label for the header. */
  label: string;
};

/**
 * What kind of deadline this is, in the user's words.
 *
 * - `hard` is set by statute, so it may be called statutory.
 * - `soft` costs money rather than the right itself - the Elterngeld
 *   three-month rule is the example: there is no date after which you cannot
 *   apply, only months you stop being paid for.
 * - `advisory` is practice. A hospital's booking window is not law and the
 *   clinic decides.
 *
 * Every branch names who decides, which is the RDG/StBerG boundary from
 * docs/legal-compliance-pack.md §3: state the rule, then name the authority.
 */
export function deadlineKindLine(
  kind: DeadlineKind,
  authority_en: string,
  note_en?: string,
): KindLine {
  const note = note_en?.trim() ? ` ${note_en.trim()}` : "";

  if (kind === "hard") {
    return {
      label: "Statutory deadline",
      text: `This date is set by statute.${note} ${decides(authority_en)}`,
    };
  }

  if (kind === "soft") {
    return {
      label: "Missing it costs money",
      text:
        `This is not a legal deadline and nothing stops you applying after it. What it costs is ` +
        `money — months you stop being paid for.${note} ${decides(authority_en)}`,
    };
  }

  return {
    label: "Practice, not law",
    text: `This is common practice rather than a rule in law.${note} ${decides(authority_en)}`,
  };
}

function decides(authority_en: string): string {
  const a = authority_en.trim().replace(/\.$/, "");
  return `${a} — and the decision in your case is theirs.`;
}

/**
 * What the source chip says about when the source was checked.
 *
 * `verified_on: null` means nobody has checked this source yet, and it is shown
 * as that rather than filled with a guess or quietly omitted. design-system.md
 * rule 1: nothing on screen without provenance, which includes the absence of it.
 */
export function asOfLabel(verified_on: string | null, source_status?: string): string {
  if (verified_on) return `checked ${formatCheckedDate(verified_on)}`;
  if (source_status === "needs_manual_verification") return "not yet checked by us";
  return "not yet checked";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `12 Aug 2026`. From the ISO parts, never through Date(). */
export function formatCheckedDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/**
 * The window/deadline sentence for the item header.
 *
 * Describes the anchor, which is the provenance the design system asks for on
 * every date: "counted from your due date" or "counted from the birth".
 */
export function anchorLine(anchor: "due_date" | "birth", certainty: "estimated" | "confirmed"): string {
  const from = anchor === "birth" ? "counted from the birth" : "counted from your due date";
  return certainty === "estimated" ? `Estimated · ${from}` : from;
}
