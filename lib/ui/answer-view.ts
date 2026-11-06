// lib/ui/answer-view.ts
//
// The Q&A panel, as data. Pure; no React, no fs, no network.
//
// Two rules live here and both are asserted in tests/ui/answer-view.test.ts:
//
//   CLAUDE.md rule 8 — "the UI never renders an 'answered' response without at
//   least one citation". The zod contract already requires a non-empty array,
//   but a contract is a promise about the server and this is the last gate
//   before a sentence reaches a pregnant person. It is checked again here.
//
//   design-system.md §5 — deflections and refusals are "visually distinct but
//   not alarming: a --rule left border, --ink-2 body, no colour. A medical
//   deflection styled in red would make an anxious person feel they'd done
//   something wrong." So this module decides the TREATMENT, and it can only
//   ever return the quiet one for those two kinds.

import type { Answer, Citation } from "../schemas";

/** How a reply is drawn. There is no third option, and no alarming one. */
export type Treatment = "card" | "aside";

export type AnswerView =
  | {
      treatment: "card";
      kind: "answered";
      text: string;
      citations: Citation[];
      /** `This applies in Hessen`. */
      scope: string;
      /** The short form of the disclaimer, legal pack §4. */
      disclaimer: string;
    }
  | {
      treatment: "aside";
      kind: "deflected" | "refused";
      /** The bold opening line of the aside. */
      heading: string;
      text: string;
    };

/**
 * The short disclaimer repeated inside every answer card.
 *
 * docs/legal-compliance-pack.md §4: the full sentence goes in the footer of
 * every route, and "a short form of it inside every answer card". This is that
 * short form.
 */
export const ANSWER_DISCLAIMER =
  "This explains the rule and where it comes from. It is not legal or tax advice, and the decision in your case lies with the authority named above.";

/**
 * The aside's opening line, by why we did not answer.
 *
 * Written so the reader learns the boundary rather than just being declined -
 * the refusal names what the corpus actually covers. None of these carries
 * urgency in colour; the medical one carries it in words, which is the whole
 * point of §5.
 */
function headingFor(answer: Extract<Answer, { kind: "deflected" | "refused" }>): string {
  if (answer.kind === "deflected") return "This one is for your midwife or doctor.";

  switch (answer.reason) {
    case "out_of_scope":
      return "This is outside what we cover.";
    case "individual_case":
      return "Only the office handling your case can answer this.";
    case "unavailable":
      return "Something on our side failed.";
    case "low_confidence":
    default:
      return "We could not find this in the official sources we cover.";
  }
}

/**
 * Turns a validated Answer into what the panel draws, or null.
 *
 * Returns NULL for an 'answered' reply carrying no citations. The caller must
 * treat that as a failure and show nothing rather than show an uncited claim -
 * rule 8, and the reason the whole retrieval layer exists.
 */
export function toAnswerView(answer: Answer): AnswerView | null {
  if (answer.kind === "answered") {
    if (!answer.citations || answer.citations.length === 0) return null;
    return {
      treatment: "card",
      kind: "answered",
      text: answer.text,
      citations: [...answer.citations],
      scope: answer.jurisdiction_scope,
      disclaimer: ANSWER_DISCLAIMER,
    };
  }

  return {
    treatment: "aside",
    kind: answer.kind,
    heading: headingFor(answer),
    text: answer.text,
  };
}

/** `BEEG §7(1)` plus `checked 12 Aug 2026`, both from the citation itself. */
export type ChipParts = { ref: string; asOf: string; href: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A source chip is "loud rather than quiet" (§5): the citation is the reason the
 * answer is believable, so it is never hidden behind a tap-to-reveal.
 *
 * The date is formatted from the ISO parts, never through Date(), for the same
 * reason the date gutter is: a UTC midnight renders as the previous day west of
 * Greenwich.
 */
export function toChip(citation: Citation): ChipParts {
  const [y, m, d] = citation.as_of.split("-");
  return {
    ref: citation.section_ref,
    asOf: `checked ${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`,
    href: citation.source_url,
  };
}

/** What the panel says while it waits. Never streamed text. */
export const WAIT_TEXT = "Checking the official sources";

/**
 * Messages for the failure modes /api/ask can return, in the house voice:
 * direction, not mood (§7).
 */
export const PANEL_ERRORS = {
  rate_limited:
    "That is as many questions as we can answer for you today. Your timeline is unaffected, and the limit resets tomorrow.",
  offline:
    "Questions need a connection. Your timeline is saved on this phone and still works without one.",
  server:
    "Something on our side failed, so we could not check the official sources. Please try again in a few minutes.",
  too_long: "That question is longer than we can read. Try asking it in a sentence or two.",
} as const;

export type PanelError = keyof typeof PANEL_ERRORS;
