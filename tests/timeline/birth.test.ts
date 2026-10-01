// F2b: recording an actual birth date, and what moves when it lands.

import { describe, expect, it } from "vitest";
import type { IntakeProfile } from "@/lib/schemas";
import { buildTimeline, computeDateChanges } from "@/lib/timeline";

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
const withBirth = (birth_date: string): IntakeProfile => ({ ...BASE, birth_date });
const byId = (p: IntakeProfile, today = TODAY) =>
  new Map(buildTimeline(p, { today }).items.map((i) => [i.id, i]));

const BIRTH_ANCHORED = [
  "standesamt_birth_registration",
  "elterngeld_application",
  "kindergeld_application",
  "baby_health_insurance",
  "consular_birth_registration",
  "indian_passport_newborn",
];

describe("certainty", () => {
  it("is estimated for every birth-anchored item before the birth", () => {
    const items = byId(BASE);
    for (const id of BIRTH_ANCHORED) expect(items.get(id)!.certainty, id).toBe("estimated");
  });

  it("flips to confirmed for exactly those items once the birth is recorded", () => {
    const items = byId(withBirth("2026-11-09"));
    for (const id of BIRTH_ANCHORED) expect(items.get(id)!.certainty, id).toBe("confirmed");
    // Due-date-anchored items were already confirmed and stay that way.
    expect(items.get("elternzeit_notify_employer")!.certainty).toBe("confirmed");
  });

  it("returns every birth-anchored item to estimated when the birth date is cleared", () => {
    const recorded = withBirth("2026-11-09");
    const cleared: IntakeProfile = { ...BASE };

    const before = byId(BASE);
    const after = byId(cleared);

    for (const id of BIRTH_ANCHORED) {
      expect(byId(recorded).get(id)!.certainty, id).toBe("confirmed");
      expect(after.get(id)!.certainty, id).toBe("estimated");
      // and the placeholder dates are the originals again
      expect(after.get(id)!.window_open, id).toBe(before.get(id)!.window_open);
      expect(after.get(id)!.deadline?.date, id).toBe(before.get(id)!.deadline?.date);
    }
  });
});

describe("computeDateChanges", () => {
  it("moves nothing when the baby arrives exactly on the due date", () => {
    expect(computeDateChanges(BASE, withBirth("2026-11-15"), { today: TODAY })).toEqual([]);
  });

  it("moves every birth-anchored date back by 21 when the baby is 21 days early", () => {
    const changes = computeDateChanges(BASE, withBirth("2026-10-25"), { today: TODAY });
    expect(changes.map((c) => c.id).sort()).toEqual([...BIRTH_ANCHORED].sort());
    for (const c of changes) {
      expect(Date.parse(c.from) - Date.parse(c.to), c.id).toBe(21 * 86_400_000);
    }
  });

  it("moves them forward by 10 when the baby is 10 days late", () => {
    const changes = computeDateChanges(BASE, withBirth("2026-11-25"), { today: TODAY });
    expect(changes).toHaveLength(BIRTH_ANCHORED.length);
    for (const c of changes) {
      expect(Date.parse(c.to) - Date.parse(c.from), c.id).toBe(10 * 86_400_000);
    }
  });

  it("leaves due-date-anchored items out of the diff entirely", () => {
    const ids = computeDateChanges(BASE, withBirth("2026-10-25"), { today: TODAY }).map((c) => c.id);
    expect(ids).not.toContain("elternzeit_notify_employer");
    expect(ids).not.toContain("hebamme_search_start");
  });

  it("reports the shape F2b renders: id, title, from, to", () => {
    const [first] = computeDateChanges(BASE, withBirth("2026-11-09"), { today: TODAY });
    expect(Object.keys(first!).sort()).toEqual(["from", "id", "title", "to"]);
    expect(first!.title.length).toBeGreaterThan(0);
  });

  it("concrete case: born 2026-11-09, six days early", () => {
    const changes = computeDateChanges(BASE, withBirth("2026-11-09"), { today: TODAY });
    const map = new Map(changes.map((c) => [c.id, c]));
    expect(map.get("standesamt_birth_registration")).toEqual({
      id: "standesamt_birth_registration",
      title: "Register the birth at the Standesamt",
      from: "2026-11-22",
      to: "2026-11-16",
    });
    expect(map.get("consular_birth_registration")!.to).toBe("2027-11-09");
    expect(map.get("elterngeld_application")!.to).toBe("2027-02-09");
  });
});

describe("recomputation after the birth lands", () => {
  it("can be overdue on first render", () => {
    // Born 2026-09-10, three weeks before a 2026-10-01 "today". The Standesamt
    // deadline is birth + 7 = 2026-09-17, already behind us.
    const item = byId(withBirth("2026-09-10")).get("standesamt_birth_registration")!;
    expect(item.deadline?.date).toBe("2026-09-17");
    expect(item.status).toBe("overdue");
    expect(item.days_until_deadline).toBeLessThan(0);
    expect(item.certainty).toBe("confirmed");
  });

  it("jumps an item straight from upcoming to urgent", () => {
    const beforeBirth = byId(BASE).get("standesamt_birth_registration")!;
    expect(beforeBirth.status).toBe("upcoming");

    const afterBirth = byId(withBirth("2026-09-28")).get("standesamt_birth_registration")!;
    expect(afterBirth.deadline?.date).toBe("2026-10-05");
    expect(afterBirth.status).toBe("urgent");
  });
});
