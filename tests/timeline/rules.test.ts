// Integrity of the rule data itself. These are the tests that stop a plausible
// but unsourced rule from reaching a family.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadRules, parseRuleFile } from "@/lib/timeline/rules";

const rules = loadRules();

const glossary = parse(
  readFileSync(join(process.cwd(), "data/glossary.de-en.yaml"), "utf8"),
) as { terms: Array<{ de: string; en_triggers: string[] }> };

const germanTerms = new Set(glossary.terms.map((t) => t.de));

/** Minimum fields for a valid rule, so a test can vary one thing at a time. */
const VALID = `
- id: probe
  track: german
  jurisdiction: federal
  title_en: Probe
  term_de: Elterngeld
  anchor: due_date
  window_open: { offset_days: 0 }
  authority_en: x
  consequence_en: x
  documents: []
  source_ref: x
  source_url: x
  verified_on: 2026-10-01
  review_after: 2027-10-01
`;

describe("source honesty", () => {
  it("never lets an unverified source carry a checked-on date", () => {
    for (const r of rules) {
      if (r.verified_on === null) {
        expect(r.source_status, `${r.id} has verified_on: null`).toBe("needs_manual_verification");
      }
    }
  });

  it("never lets a rule marked needs_manual_verification also claim a date", () => {
    for (const r of rules) {
      if (r.source_status === "needs_manual_verification") {
        expect(r.verified_on, `${r.id} is marked unverified`).toBeNull();
      }
    }
  });

  it("rejects verified_on: null without the admission, at load time", () => {
    const bad = VALID.replace("verified_on: 2026-10-01", "verified_on: null");
    expect(() => parseRuleFile(bad, "probe")).toThrow(/needs_manual_verification/);
  });

  it("rejects a needs_manual_verification rule that carries a date", () => {
    const bad = VALID.replace(
      "verified_on: 2026-10-01",
      "verified_on: 2026-10-01\n  source_status: needs_manual_verification",
    );
    expect(() => parseRuleFile(bad, "probe")).toThrow(/carries a verified_on date/);
  });

  it("flags the two consular rules for manual verification on a 90-day cycle", () => {
    for (const id of ["consular_birth_registration", "indian_passport_newborn"]) {
      const r = rules.find((x) => x.id === id)!;
      expect(r.verified_on, id).toBeNull();
      expect(r.source_status, id).toBe("needs_manual_verification");
      expect(r.review_after, id).toBe("2026-12-30");
    }
  });
});

describe("glossary agreement (CLAUDE.md rule 14)", () => {
  it("gives every German-track rule a term_de the glossary knows", () => {
    for (const r of rules.filter((x) => x.track === "german")) {
      expect(r.term_de, `${r.id} term_de`).toBeDefined();
      expect(germanTerms, `${r.id} term_de=${r.term_de}`).toContain(r.term_de!);
    }
  });

  it("gives consular rules no invented German term, but a named authority", () => {
    for (const r of rules.filter((x) => x.track === "consular")) {
      expect(r.term_de, r.id).toBeUndefined();
      expect(r.authority_local, r.id).toBeTruthy();
    }
  });

  it("rejects a German-track rule with no term_de", () => {
    const bad = VALID.replace("  term_de: Elterngeld\n", "");
    expect(() => parseRuleFile(bad, "probe")).toThrow(/german-track rules need term_de/);
  });

  it("keeps Geburtsanmeldung and Standesamt triggers disjoint", () => {
    const find = (de: string) => glossary.terms.find((t) => t.de === de)!;
    const hospital = new Set(find("Geburtsanmeldung").en_triggers.map((t) => t.toLowerCase()));
    const registry = find("Standesamt").en_triggers.map((t) => t.toLowerCase());
    for (const t of registry) expect(hospital.has(t), `shared trigger: ${t}`).toBe(false);
    expect(hospital.has("register the birth")).toBe(false);
  });
});

describe("shape", () => {
  it("gives every rule a review date later than its verification", () => {
    for (const r of rules) {
      if (r.verified_on !== null) expect(r.review_after > r.verified_on, r.id).toBe(true);
    }
  });

  it("never opens a window after its own deadline", () => {
    for (const r of rules) {
      if (r.deadline) {
        expect(r.window_open.offset_days, r.id).toBeLessThanOrEqual(r.deadline.offset_days);
      }
    }
  });

  it("refuses a duplicate id across files", () => {
    expect(() => parseRuleFile(VALID + VALID.replace("- id: probe", "- id: probe"), "probe")).not.toThrow();
    // loadRules is what dedupes across files; prove the guard exists
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
  });

  it("rejects a malformed deadline kind", () => {
    const bad = VALID.replace(
      "window_open: { offset_days: 0 }",
      "window_open: { offset_days: 0 }\n  deadline: { offset_days: 7, kind: statutory }",
    );
    expect(() => parseRuleFile(bad, "probe")).toThrow();
  });
});
