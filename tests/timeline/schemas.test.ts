// Boundary validation. The engine trusts its input because this is where input
// is checked.

import { describe, expect, it } from "vitest";
import { Answer, IntakeProfile } from "@/lib/schemas";

const VALID = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

describe("IntakeProfile", () => {
  it("accepts the seven answers with no birth fields", () => {
    expect(IntakeProfile.safeParse(VALID).success).toBe(true);
  });

  it("rejects a birth date in the future", () => {
    const result = IntakeProfile.safeParse({ ...VALID, birth_date: "2099-01-01" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).toContain("birth_date cannot be in the future");
  });

  it("accepts a birth date in the past", () => {
    expect(IntakeProfile.safeParse({ ...VALID, birth_date: "2020-01-01" }).success).toBe(true);
  });

  it("rejects a date that is not a real calendar date", () => {
    expect(IntakeProfile.safeParse({ ...VALID, due_date: "2026-02-30" }).success).toBe(false);
    expect(IntakeProfile.safeParse({ ...VALID, due_date: "2026-13-01" }).success).toBe(false);
    expect(IntakeProfile.safeParse({ ...VALID, due_date: "15/11/2026" }).success).toBe(false);
  });

  it("rejects a timestamp where a calendar date belongs", () => {
    expect(IntakeProfile.safeParse({ ...VALID, due_date: "2026-11-15T00:00:00Z" }).success).toBe(false);
  });

  it("requires exactly two nationalities", () => {
    expect(IntakeProfile.safeParse({ ...VALID, nationalities: ["India"] }).success).toBe(false);
    expect(IntakeProfile.safeParse({ ...VALID, nationalities: ["India", "India", "India"] }).success).toBe(
      false,
    );
  });

  it("rejects an out-of-scope Bundesland and a non-GKV insurance", () => {
    expect(IntakeProfile.safeParse({ ...VALID, bundesland: "bayern" }).success).toBe(false);
    expect(IntakeProfile.safeParse({ ...VALID, insurance: "pkv" }).success).toBe(false);
  });

  it("requires a full timestamp for birth_recorded_at, not a date", () => {
    expect(
      IntakeProfile.safeParse({ ...VALID, birth_date: "2020-01-01", birth_recorded_at: "2020-01-01" })
        .success,
    ).toBe(false);
    expect(
      IntakeProfile.safeParse({
        ...VALID,
        birth_date: "2020-01-01",
        birth_recorded_at: "2020-01-01T10:30:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("Answer contract (CLAUDE.md rule 8)", () => {
  const citation = {
    section_ref: "BEEG §7(1)",
    source_url: "https://www.gesetze-im-internet.de/beeg/__7.html",
    as_of: "2026-10-01",
  };

  it("accepts an answered response that carries a citation", () => {
    const result = Answer.safeParse({
      kind: "answered",
      text: "Applications are paid at most three months back.",
      citations: [citation],
      jurisdiction_scope: "This applies in Hessen",
    });
    expect(result.success).toBe(true);
  });

  it("REFUSES an answered response with zero citations", () => {
    const result = Answer.safeParse({
      kind: "answered",
      text: "Applications are paid at most three months back.",
      citations: [],
      jurisdiction_scope: "This applies in Hessen",
    });
    expect(result.success).toBe(false);
  });

  it("does not require citations on a deflection or a refusal", () => {
    expect(
      Answer.safeParse({ kind: "deflected", text: "Please speak to your Hebamme.", reason: "medical" })
        .success,
    ).toBe(true);
    expect(
      Answer.safeParse({
        kind: "refused",
        text: "Only the Elterngeldstelle decides your case.",
        reason: "individual_case",
      }).success,
    ).toBe(true);
  });

  it("requires as_of on every citation", () => {
    const { as_of, ...noAsOf } = citation;
    expect(as_of).toBeTruthy();
    expect(
      Answer.safeParse({
        kind: "answered",
        text: "x",
        citations: [noAsOf],
        jurisdiction_scope: "This applies in Hessen",
      }).success,
    ).toBe(false);
  });
});
