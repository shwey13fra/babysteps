// The Q&A panel's view layer.
//
// Two house rules are enforced here and nowhere else in the UI:
//
//   Rule 8 - the UI never renders an 'answered' response without at least one
//   citation. The zod contract already requires a non-empty array, but that is a
//   promise about the server; this is the last gate before a sentence reaches a
//   pregnant person, so it is checked again.
//
//   design-system.md §5 - a deflection or refusal is drawn quietly. "A medical
//   deflection styled in red would make an anxious person feel they'd done
//   something wrong."

import { describe, expect, it } from "vitest";
import { Answer } from "@/lib/schemas";
import type { Answer as AnswerType } from "@/lib/schemas";
import {
  ANSWER_DISCLAIMER,
  PANEL_ERRORS,
  WAIT_TEXT,
  toAnswerView,
  toChip,
} from "@/lib/ui/answer-view";

const CITATION = {
  section_ref: "BEEG §7(1)",
  source_url: "https://www.gesetze-im-internet.de/beeg/__7.html",
  as_of: "2026-08-12",
};

const ANSWERED: AnswerType = {
  kind: "answered",
  text: "Elterngeld is paid for at most three months back from the month your application arrives.",
  citations: [CITATION],
  jurisdiction_scope: "Applies across Germany.",
  glossed_terms: [],
};

describe("rule 8: no answer renders without a citation", () => {
  it("renders an answered reply that has one", () => {
    const view = toAnswerView(ANSWERED);
    expect(view).not.toBeNull();
    expect(view?.treatment).toBe("card");
  });

  it("returns null for an answered reply with an empty citation list", () => {
    // The contract would reject this, so it should be unreachable - which is
    // exactly why it is worth a test. A second gate costs nothing and the thing
    // it prevents is an uncited legal claim on screen.
    const uncited = { ...ANSWERED, citations: [] } as unknown as AnswerType;
    expect(toAnswerView(uncited)).toBeNull();
  });

  it("returns null when citations are missing entirely", () => {
    const { citations: _c, ...rest } = ANSWERED as Record<string, unknown> & { citations: unknown };
    expect(toAnswerView(rest as unknown as AnswerType)).toBeNull();
  });

  it("the contract itself also rejects an uncited answer", () => {
    expect(Answer.safeParse({ ...ANSWERED, citations: [] }).success).toBe(false);
  });
});

describe("§5: deflections and refusals are quiet", () => {
  const deflected: AnswerType = {
    kind: "deflected",
    text: "Call your Frauenarzt or Hebamme. Outside surgery hours the on-call service is 116117.",
    reason: "medical",
  };

  const refusals = (["low_confidence", "out_of_scope", "individual_case", "unavailable"] as const).map(
    (reason) => ({ kind: "refused" as const, text: "We do not cover this.", reason }),
  );

  it("gives a medical deflection the aside treatment, never a card", () => {
    const view = toAnswerView(deflected);
    expect(view?.treatment).toBe("aside");
  });

  it.each(refusals.map((r) => [r.reason, r] as const))(
    "gives a %s refusal the aside treatment",
    (_reason, answer) => {
      expect(toAnswerView(answer)?.treatment).toBe("aside");
    },
  );

  it("never produces an alarming word in a heading", () => {
    const headings = [deflected, ...refusals].map((a) => toAnswerView(a));
    for (const view of headings) {
      expect(view?.treatment).toBe("aside");
      const heading = view && view.treatment === "aside" ? view.heading : "";
      expect(heading).not.toMatch(/!|urgent|warning|error|sorry/i);
      expect(heading).not.toMatch(/[A-Z]{3,}/);
    }
  });

  it("carries urgency in words on the medical deflection, not in a treatment", () => {
    const view = toAnswerView(deflected);
    expect(view?.treatment).toBe("aside");
    if (view?.treatment === "aside") {
      expect(view.heading).toMatch(/midwife|doctor/i);
      // The emergency numbers live in the text the guard wrote, untouched.
      expect(view.text).toContain("116117");
    }
  });

  it("names the boundary on an out-of-scope refusal rather than just declining", () => {
    const view = toAnswerView({ kind: "refused", text: "x", reason: "out_of_scope" });
    if (view?.treatment === "aside") expect(view.heading).toMatch(/outside what we cover/i);
  });

  it("does not blame the user when our own pipeline failed", () => {
    const view = toAnswerView({ kind: "refused", text: "x", reason: "unavailable" });
    if (view?.treatment === "aside") {
      expect(view.heading).toMatch(/our side/i);
      expect(view.heading).not.toMatch(/your/i);
    }
  });
});

describe("the answer card carries the short disclaimer and the scope", () => {
  it("includes both", () => {
    const view = toAnswerView(ANSWERED);
    if (view?.treatment === "card") {
      expect(view.scope).toBe("Applies across Germany.");
      expect(view.disclaimer).toBe(ANSWER_DISCLAIMER);
    }
  });

  it("the disclaimer names who decides and disclaims advice", () => {
    // legal-compliance-pack §4: a short form of the footer sentence inside every
    // answer card.
    expect(ANSWER_DISCLAIMER).toMatch(/not legal or tax advice/i);
    expect(ANSWER_DISCLAIMER).toMatch(/authority/i);
  });

  it("never promises an entitlement in the disclaimer", () => {
    expect(ANSWER_DISCLAIMER).not.toMatch(/you (will|are) (get|entitled|receive)/i);
  });
});

describe("source chips", () => {
  it("renders the § reference and the checked date from the citation", () => {
    const chip = toChip(CITATION);
    expect(chip.ref).toBe("BEEG §7(1)");
    expect(chip.asOf).toBe("checked 12 Aug 2026");
    expect(chip.href).toBe(CITATION.source_url);
  });

  it("does not go through Date()", () => {
    expect(toChip({ ...CITATION, as_of: "2026-01-01" }).asOf).toBe("checked 1 Jan 2026");
  });
});

describe("the wait state and the failure messages", () => {
  it("says what it is doing, and is not streamed text", () => {
    expect(WAIT_TEXT).toBe("Checking the official sources");
  });

  it("gives direction rather than mood", () => {
    // §7: empty and error states give direction, not mood.
    for (const message of Object.values(PANEL_ERRORS)) {
      expect(message).not.toMatch(/!|oops|sorry|unfortunately/i);
      expect(message.length).toBeGreaterThan(30);
    }
  });

  it("tells an offline reader the timeline still works", () => {
    expect(PANEL_ERRORS.offline).toMatch(/timeline is saved on this phone/i);
  });
});
