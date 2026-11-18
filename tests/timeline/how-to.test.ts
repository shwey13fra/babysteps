// "How to start" — the practical route, and the three things it must not become.
//
// WHY THE FIELD EXISTS. A rule could say WHEN a thing is due, WHO decides it
// and WHAT to bring, and had nowhere to say HOW a parent starts.
// `hebamme_search_start` read "You find the midwife yourself; your Krankenkasse
// covers the care" — true, and useless to someone who does not know where to
// look. `/ask` could not fill the gap: the corpus is statute text, so it will
// never contain a directory or a referral route, and rule 8 forbids an answer
// without a citation.
//
// WHAT IT MUST NOT BECOME, and why each is tested rather than trusted:
//
//   1. Advice about this reader's case. Rule 13 — state the rule, name the
//      authority that decides. "Search this directory" is a route; "you will
//      get a midwife" is an outcome, and not ours to predict.
//   2. A link without a date. Every other source in this product carries the
//      day it was checked; a third-party directory rots faster than a statute,
//      not slower, so it needs the date more.
//   3. A soft deadline quietly becoming a hard one. Rule 12 — this rule's
//      deadline is `advisory`, and telling someone HOW to hurry must not start
//      implying they are late in law.
//
// CLAUDE.md rule 16: every check runs against a mutated copy too.

import { describe, expect, it } from "vitest";
import { Rule, loadRules } from "@/lib/timeline/rules";

const RULES = loadRules();
const MIDWIFE = RULES.find((r) => r.id === "hebamme_search_start");

describe("the midwife rule finally says how to start", () => {
  it("exists at all", () => {
    expect(MIDWIFE, "hebamme_search_start is missing from the rule files").toBeDefined();
  });

  it("carries ordered steps", () => {
    expect(MIDWIFE!.how_to?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("starts with a searchable directory", () => {
    const first = MIDWIFE!.how_to![0];
    expect(first.url).toBeDefined();
    // Verified by fetching it on 2026-11-18, not by assuming: the page titles
    // itself Hebammensuche.de, asks "Ich suche eine Hebamme", requires a
    // Postleitzahl, and filters for Hausbesuche and free capacity.
    expect(first.url).toContain("hebammensuche.de");
    expect(first.step_en.toLowerCase()).toContain("postcode");
  });

  it("ends with the referral, because it is what you do when the rest fails", () => {
    const last = MIDWIFE!.how_to![MIDWIFE!.how_to!.length - 1];
    expect(last.step_en).toContain("Frauenarzt");
  });

  it("uses the glossary's German, never an invented one", () => {
    // Rule 14. `Frauenarzt` is the gloss-only entry in data/glossary.de-en.yaml;
    // Gynäkologe, Gynäkologin and Frauenärztin are not in it, so they are
    // fabrications however natural they read.
    const words = MIDWIFE!.how_to!.map((s) => s.step_en).join(" ");
    expect(words).not.toMatch(/Gyn[äa]kolog|Frauen[äa]rztin/);
  });
});

describe("a step is a route, not a prediction about this reader", () => {
  const OUTCOME =
    /\byou will (get|receive|be given|have)\b|\byou are entitled\b|\bguarantee(d|s)?\b|\bwe will (get|find|arrange)\b/i;

  it("promises no outcome anywhere in the rule set", () => {
    // Rule 13: never state, predict or imply this user's entitlement or the
    // outcome of their application.
    for (const rule of RULES) {
      for (const step of rule.how_to ?? []) {
        expect(step.step_en, `${rule.id}: a step predicts an outcome`).not.toMatch(OUTCOME);
      }
    }
  });

  it("CONTROL: that matcher catches one", () => {
    expect("Search the directory and you will get a midwife.").toMatch(OUTCOME);
    expect("You are entitled to a home visit.").toMatch(OUTCOME);
  });

  it("CONTROL: the loop is not running over an empty set", () => {
    // A `for` over no steps passes every assertion inside it.
    const steps = RULES.flatMap((r) => r.how_to ?? []);
    expect(steps.length).toBeGreaterThan(0);
  });

  it("never describes an advisory deadline as a legal one", () => {
    // Rule 12. This rule's deadline is `kind: advisory` — practice, not statute.
    expect(MIDWIFE!.deadline?.kind).toBe("advisory");
    const words = MIDWIFE!.how_to!.map((s) => s.step_en).join(" ");
    expect(words).not.toMatch(/\brequired by law\b|\bstatutory deadline\b|\byou must\b|\bdeadline\b/i);
  });

  it("CONTROL: that matcher catches one too", () => {
    expect("You must register by the statutory deadline.").toMatch(
      /\brequired by law\b|\bstatutory deadline\b|\byou must\b|\bdeadline\b/i,
    );
  });
});

describe("a link never appears without the day it was checked", () => {
  it("holds across every rule", () => {
    for (const rule of RULES) {
      for (const step of rule.how_to ?? []) {
        if (step.url === undefined) continue;
        expect(step.checked_on, `${rule.id}: a link with no checked_on`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("is enforced by the schema, not just by this test", () => {
    // The schema refinement is the real guard; a test can be deleted, and the
    // next person adding a link would not know the rule existed.
    const base = { ...MIDWIFE!, how_to: [{ step_en: "Look here.", url: "https://example.org/" }] };
    expect(Rule.safeParse(base).success, "a url without checked_on was accepted").toBe(false);
  });

  it("CONTROL: and accepts the pair together", () => {
    const ok = { ...MIDWIFE!, how_to: [{ step_en: "Look here.", url: "https://example.org/", checked_on: "2026-11-18" }] };
    expect(Rule.safeParse(ok).success).toBe(true);
  });

  it("CONTROL: and rejects a checked_on with no link", () => {
    const bad = { ...MIDWIFE!, how_to: [{ step_en: "Look here.", checked_on: "2026-11-18" }] };
    expect(Rule.safeParse(bad).success).toBe(false);
  });
});
