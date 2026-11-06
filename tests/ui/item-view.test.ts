// The item page's deadline-kind line, and the as-of label.
//
// CLAUDE.md rule 12 is the reason this file exists: "a deadline whose rule file
// says kind: soft or advisory must never be described anywhere - UI, answer,
// e-mail - as a legal or statutory deadline." The item page is the one screen
// that says what kind of deadline an item carries, so it is the one screen that
// can break that rule, and the assertions below run over EVERY rule in
// data/rules rather than over invented examples.

import { describe, expect, it } from "vitest";
import { loadRules } from "@/lib/timeline/rules";
import { asOfLabel, anchorLine, deadlineKindLine, formatCheckedDate } from "@/lib/ui/item-view";

/**
 * Phrases that ASSERT a deadline is law. A soft or advisory item may say it is
 * NOT a legal deadline - that is the point - so the patterns match the positive
 * claim only.
 */
const CLAIMS_LAW = [
  /\bis set by statute\b/i,
  /\bthe law requires\b/i,
  /\brequired by law\b/i,
  /\bis a (statutory|legal) deadline\b/i,
  /\bstatutory deadline\b/i,
  /\blegally required\b/i,
];

const RULES = loadRules();

describe("the rules this runs against", () => {
  it("loads them, so nothing below is vacuous", () => {
    expect(RULES.length).toBeGreaterThan(8);
  });

  it("includes at least one of each deadline kind, or the sweep proves little", () => {
    const kinds = new Set(RULES.map((r) => r.deadline?.kind).filter(Boolean));
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });
});

describe("rule 12: a soft or advisory deadline is never called law", () => {
  const soft = RULES.filter((r) => r.deadline && r.deadline.kind !== "hard");

  it.each(soft.map((r) => [r.id, r] as const))(
    "%s does not claim to be statutory",
    (_id, rule) => {
      const line = deadlineKindLine(rule.deadline!.kind, rule.authority_en, rule.deadline!.note_en);
      for (const pattern of CLAIMS_LAW) {
        expect(line.text, `text: ${line.text}`).not.toMatch(pattern);
        expect(line.label, `label: ${line.label}`).not.toMatch(pattern);
      }
    },
  );

  it("says plainly that a soft deadline is not a legal one", () => {
    const line = deadlineKindLine("soft", "The Elterngeldstelle decides");
    expect(line.text).toContain("not a legal deadline");
    expect(line.text).toMatch(/costs.*money|money/i);
  });

  it("calls an advisory item practice rather than a rule", () => {
    const line = deadlineKindLine("advisory", "The clinic decides");
    expect(line.text).toMatch(/practice/i);
    expect(line.label).toBe("Practice, not law");
  });

  it("DOES allow a hard deadline to be called statutory", () => {
    // The guard must not be so blunt that it makes the true statement
    // impossible: a hard deadline is set by statute and should say so.
    const line = deadlineKindLine("hard", "The Standesamt decides");
    expect(line.text).toContain("set by statute");
    expect(line.label).toBe("Statutory deadline");
  });
});

describe("every kind names who decides", () => {
  it.each(["hard", "soft", "advisory"] as const)("%s points at the authority", (kind) => {
    // legal-compliance-pack §3: state the rule, then name the authority. The
    // item page never says what the reader is entitled to.
    const line = deadlineKindLine(kind, "The Elterngeldstelle decides your application");
    expect(line.text).toContain("Elterngeldstelle");
    expect(line.text).toContain("the decision in your case is theirs");
  });

  it("does not double a full stop when the authority ends in one", () => {
    const line = deadlineKindLine("hard", "The Standesamt decides.");
    expect(line.text).not.toContain("..");
  });

  it("carries the rule's own note when there is one", () => {
    const line = deadlineKindLine("advisory", "You decide", "Midwives are booked months ahead.");
    expect(line.text).toContain("Midwives are booked months ahead.");
  });
});

describe("as-of labels never invent a date", () => {
  it("says a source has not been checked rather than guessing", () => {
    expect(asOfLabel(null)).toMatch(/not yet checked/);
    expect(asOfLabel(null)).not.toMatch(/\d/);
  });

  it("distinguishes a source flagged for manual verification", () => {
    expect(asOfLabel(null, "needs_manual_verification")).toBe("not yet checked by us");
  });

  it("shows the checked date when there is one", () => {
    expect(asOfLabel("2026-08-12")).toBe("checked 12 Aug 2026");
  });

  it.each(RULES.map((r) => [r.id, r] as const))(
    "%s never shows a digit when verified_on is null",
    (_id, rule) => {
      const label = asOfLabel(rule.verified_on, rule.source_status);
      if (rule.verified_on === null) expect(label).not.toMatch(/\d/);
      else expect(label).toMatch(/\d/);
    },
  );
});

describe("formatCheckedDate does not go through Date()", () => {
  it("renders the first of January as the first", () => {
    // The UTC-midnight trap again: new Date("2026-01-01").getDate() is 31
    // anywhere west of UTC.
    expect(formatCheckedDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatCheckedDate("2026-12-31")).toBe("31 Dec 2026");
  });
});

describe("anchorLine states the provenance of every date", () => {
  it("names the due date or the birth", () => {
    expect(anchorLine("due_date", "confirmed")).toBe("counted from your due date");
    expect(anchorLine("birth", "confirmed")).toBe("counted from the birth");
  });

  it("marks an estimated date as estimated", () => {
    expect(anchorLine("birth", "estimated")).toBe("Estimated · counted from the birth");
  });
});
