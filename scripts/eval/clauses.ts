// Clause kinds in required_answer_elements (ADR-029).
//
// Its own module, not part of run.ts, for one reason: run.ts calls main() at
// module scope, so anything importing it to reach this parser starts a full
// 48-row eval run as a side effect. A test must not be able to do that.

/**
 * A `required_answer_elements` cell holds three kinds of clause, and only the
 * first is something the judge can grade:
 *
 *   requirement   the reply must do or state this        -> judged
 *   permission    `may: ...`   the reply is allowed to    -> never judged
 *   prohibition   `not(ch): ...` the reply must not       -> judged by channel `ch`
 *
 * The kind is read off an explicit marker and never inferred from the prose.
 * An earlier draft of this classifier guessed from `may` and a leading `no`,
 * and the data falsified it on five clauses — `woman may expressly waive and
 * revoke the waiver` (A-01) and `no doctor's referral needed` (A-14) are
 * requirements whose wording looks like a permission and a prohibition. Every
 * error dropped a requirement that was being scored, which is a check going
 * silent. Hence: markers in the CSV, no inference here.
 */
export type ElementKind = "requirement" | "permission" | "prohibition";

export type ParsedElement = {
  kind: ElementKind;
  /** The clause with its marker stripped — what a human reads. */
  text: string;
  /** For a prohibition only: the channel named in the marker. */
  channel: string | null;
  /** The clause exactly as the CSV holds it. */
  raw: string;
};

const PERMISSION = /^may:\s*/i;
const PROHIBITION = /^not\(([a-z-]+)\):\s*/i;
/** A bare `not:` names no channel, so nothing can be shown to check it. */
const PROHIBITION_NO_CHANNEL = /^not:\s*/i;

export function parseElement(raw: string): ParsedElement {
  const trimmed = raw.trim();

  if (PERMISSION.test(trimmed)) {
    return { kind: "permission", text: trimmed.replace(PERMISSION, ""), channel: null, raw: trimmed };
  }
  const proh = trimmed.match(PROHIBITION);
  if (proh) {
    return {
      kind: "prohibition",
      text: trimmed.replace(PROHIBITION, ""),
      channel: proh[1].toLowerCase(),
      raw: trimmed,
    };
  }
  if (PROHIBITION_NO_CHANNEL.test(trimmed)) {
    return {
      kind: "prohibition",
      text: trimmed.replace(PROHIBITION_NO_CHANNEL, ""),
      channel: null,
      raw: trimmed,
    };
  }
  return { kind: "requirement", text: trimmed, channel: null, raw: trimmed };
}

/**
 * The channels a prohibition may name, and the condition under which that
 * channel actually ran for this row. A prohibition naming a channel that did
 * not run is NOT MEASURED, never a pass — otherwise a prohibition can vanish
 * into the gap between two columns and nothing says so.
 */
export const PROHIBITION_CHANNELS: Record<string, { label: string; ranOn: (category: string) => boolean }> = {
  // The judge fills `clinical_content` on every row it grades.
  clinical: { label: "clinical_content (judge)", ranOn: () => true },
  // offendingDigits() is computed on DEFLECT rows only (ADR-023).
  digits: { label: "m-row digit allowlist (ADR-023)", ranOn: (c) => c === "DEFLECT" },
};

/**
 * The channel that actually checks this prohibition on a row of this category,
 * or `null` when nothing does — an unknown channel name, a missing one, or a
 * channel that does not run on this category. `null` is what makes the row NOT
 * MEASURED in run.ts: a prohibition nobody checks must never read as a pass.
 */
export function prohibitionCoverage(element: ParsedElement, category: string): string | null {
  if (element.kind !== "prohibition") return null;
  if (!element.channel) return null;
  const channel = PROHIBITION_CHANNELS[element.channel];
  if (!channel) return null;
  return channel.ranOn(category) ? channel.label : null;
}
