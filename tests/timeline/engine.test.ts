import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { IntakeProfile } from "@/lib/schemas";
import { buildTimeline } from "@/lib/timeline";
import { allowedJurisdictions, bundeslandToJurisdiction } from "@/lib/timeline/applies";
import { loadRules, parseRuleFile } from "@/lib/timeline/rules";
import { URGENT_WINDOW_DAYS, deriveStatus } from "@/lib/timeline/status";

/**
 * The playbook's hand-verification profile: due 2026-11-15, Hessen, both Indian,
 * unmarried.
 *
 * Engine tests build profiles as plain typed objects rather than through
 * IntakeProfile.parse. The schema rejects a future birth_date against the real
 * clock, which would make every birth test expire; validation is a boundary
 * concern and is tested as such in schemas.test.ts.
 */
const BASE: IntakeProfile = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

const TODAY = "2026-10-01";

const byId = (profile: IntakeProfile, today = TODAY) =>
  new Map(buildTimeline(profile, { today }).items.map((i) => [i.id, i]));

const FIXTURES = parseRuleFile(
  readFileSync(join(process.cwd(), "tests/fixtures/state-scoped.rule.yaml"), "utf8"),
  "state-scoped.rule.yaml",
);

describe("rule loading", () => {
  it("loads exactly the twelve canonical rules with unique ids", () => {
    const rules = loadRules();
    expect(rules).toHaveLength(12);
    expect(new Set(rules.map((r) => r.id)).size).toBe(12);
  });

  it("contains every id the Phase 1 scope names", () => {
    const ids = loadRules().map((r) => r.id).sort();
    expect(ids).toEqual(
      [
        "baby_health_insurance",
        "consular_birth_registration",
        "elterngeld_application",
        "elternzeit_notify_employer",
        "hebamme_search_start",
        "hospital_registration",
        "indian_passport_newborn",
        "kindergeld_application",
        "mutterschaftsgeld_application",
        "mutterschutz_notify_employer",
        "standesamt_birth_registration",
        "vaterschaftsanerkennung",
      ].sort(),
    );
  });
});

describe("anchor types", () => {
  it("marks due-date-anchored items confirmed even before the birth", () => {
    const item = byId(BASE).get("elternzeit_notify_employer")!;
    expect(item.anchor).toBe("due_date");
    expect(item.certainty).toBe("confirmed");
  });

  it("marks birth-anchored items estimated and computes them from the due date", () => {
    const item = byId(BASE).get("elterngeld_application")!;
    expect(item.anchor).toBe("birth");
    expect(item.certainty).toBe("estimated");
    expect(item.window_open).toBe("2026-11-15");
    expect(item.deadline?.date).toBe("2027-02-15");
  });

  it("computes the dates the playbook asks you to hand-verify", () => {
    const items = byId(BASE);
    expect(items.get("elternzeit_notify_employer")!.deadline?.date).toBe("2026-09-27");
    expect(items.get("elterngeld_application")!.deadline?.date).toBe("2027-02-15");
    expect(items.get("consular_birth_registration")!.deadline?.date).toBe("2027-11-15");
    expect(items.get("standesamt_birth_registration")!.deadline?.date).toBe("2026-11-22");
  });

  it("shifts every dependent date by one when the due date moves by one", () => {
    const before = byId(BASE);
    const after = byId({ ...BASE, due_date: "2026-11-16" });
    for (const [id, item] of before) {
      const moved = after.get(id)!;
      expect(moved.window_open, id).toBe(
        new Date(Date.parse(item.window_open) + 86_400_000).toISOString().slice(0, 10),
      );
    }
  });
});

describe("deadline kinds", () => {
  it("gives every rule a kind, and the two the scope pins explicitly", () => {
    const items = byId(BASE);
    for (const item of items.values()) {
      if (item.deadline) expect(["hard", "soft", "advisory"], item.id).toContain(item.deadline.kind);
    }
    expect(items.get("elterngeld_application")!.deadline?.kind).toBe("soft");
    expect(items.get("consular_birth_registration")!.deadline?.kind).toBe("hard");
    expect(items.get("elternzeit_notify_employer")!.deadline?.kind).toBe("hard");
  });

  it("says in writing that the Elterngeld deadline is not statutory", () => {
    const note = byId(BASE).get("elterngeld_application")!.deadline?.note_en ?? "";
    expect(note.toLowerCase()).toContain("not a statutory cut-off");
    expect(note.toLowerCase()).toContain("three months");
  });

  it("sets the consular registration deadline at 365 days", () => {
    const item = byId(BASE).get("consular_birth_registration")!;
    expect(item.deadline?.date).toBe("2027-11-15");
  });
});

describe("jurisdiction filtering", () => {
  it("maps the intake vocabulary to the corpus vocabulary", () => {
    expect(bundeslandToJurisdiction("hessen")).toBe("hesse");
    expect(bundeslandToJurisdiction("berlin")).toBe("berlin");
  });

  it("gives a Hessen profile hesse and never berlin", () => {
    expect(allowedJurisdictions(BASE)).toContain("hesse");
    expect(allowedJurisdictions(BASE)).not.toContain("berlin");
  });

  it("shows a hesse-scoped rule to Hessen and hides it from Berlin", () => {
    const hessen = buildTimeline(BASE, { today: TODAY, rules: FIXTURES }).items.map((i) => i.id);
    const berlin = buildTimeline({ ...BASE, bundesland: "berlin" }, { today: TODAY, rules: FIXTURES }).items.map(
      (i) => i.id,
    );

    expect(hessen).toContain("fixture_hesse_only");
    expect(hessen).not.toContain("fixture_berlin_only");
    expect(berlin).toContain("fixture_berlin_only");
    expect(berlin).not.toContain("fixture_hesse_only");
  });

  it("hides the consular track from a profile with no Indian parent", () => {
    const german = byId({ ...BASE, nationalities: ["Germany", "Germany"] });
    expect(german.has("consular_birth_registration")).toBe(false);
    expect(german.has("indian_passport_newborn")).toBe(false);
    expect(german.has("elterngeld_application")).toBe(true);
  });

  it("shows the consular track when either parent is Indian", () => {
    expect(byId({ ...BASE, nationalities: ["Germany", "India"] }).has("consular_birth_registration")).toBe(true);
    expect(byId({ ...BASE, nationalities: ["India", "Germany"] }).has("consular_birth_registration")).toBe(true);
  });
});

describe("applies_if", () => {
  it("shows Vaterschaftsanerkennung to an unmarried couple", () => {
    expect(byId(BASE).has("vaterschaftsanerkennung")).toBe(true);
  });

  it("hides it from a married couple", () => {
    expect(byId({ ...BASE, marital_status: "married" }).has("vaterschaftsanerkennung")).toBe(false);
  });

  it("hides employer-facing items from someone who is not employed", () => {
    const selfEmployed = byId({ ...BASE, employment_status: "self-employed" });
    expect(selfEmployed.has("elternzeit_notify_employer")).toBe(false);
    expect(selfEmployed.has("mutterschutz_notify_employer")).toBe(false);
    expect(selfEmployed.has("elterngeld_application")).toBe(true);
  });

  it("throws on a condition naming a field that is not a scalar profile field", () => {
    const bad = parseRuleFile(
      `
- id: bad_condition
  track: german
  jurisdiction: federal
  title_en: Bad
  term_de: Elterngeld
  anchor: due_date
  window_open: { offset_days: 0 }
  applies_if: { all: [ { nationalities: [India] } ] }
  authority_en: x
  consequence_en: x
  documents: []
  source_ref: x
  source_url: x
  verified_on: null
  source_status: needs_manual_verification
  review_after: 2027-10-01
`,
      "inline",
    );
    expect(() => buildTimeline(BASE, { today: TODAY, rules: bad })).toThrow(/not a scalar profile field/);
  });
});

describe("status derivation", () => {
  it("is urgent at exactly fourteen days and current at fifteen", () => {
    const born = { ...BASE, birth_date: "2026-09-01" };
    // elterngeld: window at birth, soft deadline at birth + 92 = 2026-12-02
    expect(byId(born, "2026-11-18").get("elterngeld_application")!.status).toBe("urgent");
    expect(byId(born, "2026-11-17").get("elterngeld_application")!.status).toBe("current");
    expect(byId(born, "2026-11-18").get("elterngeld_application")!.days_until_deadline).toBe(
      URGENT_WINDOW_DAYS,
    );
  });

  it("puts upcoming ahead of urgent so an unopened window never shows amber", () => {
    // Standesamt: window at birth, deadline birth + 7. Fourteen days before the
    // placeholder birth the deadline is inside the urgent window, but the user
    // cannot act yet.
    expect(deriveStatus("2026-11-08", "2026-11-15", "2026-11-22")).toBe("upcoming");
    expect(deriveStatus("2026-11-15", "2026-11-15", "2026-11-22")).toBe("urgent");
  });

  it("reports overdue once the deadline has passed", () => {
    expect(deriveStatus("2026-11-23", "2026-11-15", "2026-11-22")).toBe("overdue");
  });

  it("leaves a deadline-free item current on its open day and past afterwards", () => {
    expect(deriveStatus("2026-11-15", "2026-11-15", undefined)).toBe("current");
    expect(deriveStatus("2026-11-16", "2026-11-15", undefined)).toBe("past");
    expect(deriveStatus("2026-11-14", "2026-11-15", undefined)).toBe("upcoming");
  });
});

describe("ordering", () => {
  it("sorts by window_open and is stable across runs", () => {
    const once = buildTimeline(BASE, { today: TODAY }).items.map((i) => i.id);
    const twice = buildTimeline(BASE, { today: TODAY }).items.map((i) => i.id);
    expect(once).toEqual(twice);

    const opens = buildTimeline(BASE, { today: TODAY }).items.map((i) => i.window_open);
    expect([...opens]).toEqual([...opens].sort());
  });

  it("echoes the date it derived status against", () => {
    expect(buildTimeline(BASE, { today: TODAY }).as_of).toBe(TODAY);
  });
});
