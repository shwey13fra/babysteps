// The declared-balance ledger and the coverage gate (ADR-055).
//
// House rule: a checker that cannot fail is not a check. The gate exists
// because of iter9 — it spent $1.08 reaching row 10 of 48 and produced no
// baseline — so the tests that matter most are the ones proving it REFUSES,
// and that it refuses for the right arithmetic.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertBudget,
  estimateRun,
  loadBudget,
  meanCostPerRow,
  recordSpend,
  type Budget,
  type Estimate,
} from "@/scripts/preflight";

/** A ledger file under the OS temp dir, addressed relative to cwd as the module expects. */
function tempLedger(remaining: number, multiplier = 1.5): string {
  const dir = mkdtempSync(join(tmpdir(), "babysteps-budget-"));
  const abs = join(dir, "eval-budget.yaml");
  writeFileSync(
    abs,
    [
      "version: 1",
      `remaining_usd: ${remaining.toFixed(2)}`,
      "last_topped_up: 2026-11-04",
      `headroom_multiplier: ${multiplier}`,
      "ledger: []",
      "",
    ].join("\n"),
  );
  return relative(process.cwd(), abs).split("\\").join("/");
}

const est = (total: number, b: Budget): Estimate => ({
  rows: 48,
  perRow: total / 48,
  total,
  required: total * b.headroom_multiplier,
  from: "fixture.json",
});

describe("the gate refuses — the iter9 case", () => {
  it("throws when the declared balance is below the required headroom", () => {
    const b = loadBudget(tempLedger(5.0));
    // $4.07 x 1.5 = $6.11 required, $5.00 declared.
    expect(() => assertBudget(est(4.07, b), b, false)).toThrow(/REFUSING TO START/);
  });

  it("names the shortfall, the multiplier and the declared figure in the message", () => {
    const b = loadBudget(tempLedger(5.0));
    try {
      assertBudget(est(4.07, b), b, false);
      throw new Error("should have thrown");
    } catch (e) {
      const m = (e as Error).message;
      expect(m).toContain("$4.07");
      expect(m).toContain("required at 1.5x");
      expect(m).toContain("$6.11");
      expect(m).toContain("short by");
      expect(m).toContain("$1.11");
    }
  });

  it("refuses a run it could ALMOST afford — the margin is the point", () => {
    const b = loadBudget(tempLedger(6.1));
    expect(() => assertBudget(est(4.07, b), b, false)).toThrow(/REFUSING TO START/);
  });

  it("refuses at a declared zero", () => {
    const b = loadBudget(tempLedger(0));
    expect(() => assertBudget(est(0.35, b), b, false)).toThrow(/REFUSING TO START/);
  });
});

describe("the gate allows", () => {
  it("passes when the balance clears the headroom exactly", () => {
    const b = loadBudget(tempLedger(6.11));
    expect(() => assertBudget(est(4.07, b), b, false)).not.toThrow();
  });

  it("passes with room to spare", () => {
    const b = loadBudget(tempLedger(20));
    expect(() => assertBudget(est(4.07, b), b, false)).not.toThrow();
  });

  it("does not block when no comparable baseline exists — it says so instead", () => {
    const b = loadBudget(tempLedger(0));
    expect(() => assertBudget(null, b, false)).not.toThrow();
  });

  it("--ignore-budget overrides a refusal", () => {
    const b = loadBudget(tempLedger(0));
    expect(() => assertBudget(est(4.07, b), b, true)).not.toThrow();
  });
});

describe("the ledger decrements from MEASURED cost", () => {
  it("subtracts the spend and appends an auditable entry", () => {
    const f = tempLedger(20);
    recordSpend("iter9-confirm", 1.08, f);
    const after = loadBudget(f);
    expect(after.remaining_usd).toBeCloseTo(18.92, 2);
    expect(after.ledger).toHaveLength(1);
    expect(after.ledger[0].measured_usd).toBeCloseTo(1.08, 2);
    expect(after.ledger[0].label).toBe("iter9-confirm");
  });

  it("accumulates entries across runs", () => {
    const f = tempLedger(20);
    recordSpend("iter8", 4.07, f);
    recordSpend("iter9-confirm", 1.08, f);
    const after = loadBudget(f);
    expect(after.remaining_usd).toBeCloseTo(14.85, 2);
    expect(after.ledger.map((e) => e.label)).toEqual(["iter8", "iter9-confirm"]);
  });

  it("floors at zero rather than going negative", () => {
    const f = tempLedger(1);
    recordSpend("overrun", 4.07, f);
    expect(loadBudget(f).remaining_usd).toBe(0);
  });

  it("keeps the human's fields intact", () => {
    const f = tempLedger(20);
    recordSpend("iter8", 4.07, f);
    const raw = readFileSync(join(process.cwd(), f), "utf8");
    expect(raw).toContain("last_topped_up: 2026-11-04");
    expect(raw).toContain("headroom_multiplier: 1.5");
  });
});

describe("loadBudget validates rather than guessing", () => {
  it("throws on a non-numeric remaining_usd", () => {
    const dir = mkdtempSync(join(tmpdir(), "babysteps-budget-"));
    const abs = join(dir, "eval-budget.yaml");
    writeFileSync(abs, "remaining_usd: soon\nheadroom_multiplier: 1.5\nledger: []\n");
    const f = relative(process.cwd(), abs).split("\\").join("/");
    expect(() => loadBudget(f)).toThrow(/remaining_usd must be a number/);
  });

  it("throws on a multiplier below 1 — that would permit a run it cannot cover", () => {
    const dir = mkdtempSync(join(tmpdir(), "babysteps-budget-"));
    const abs = join(dir, "eval-budget.yaml");
    writeFileSync(abs, "remaining_usd: 10\nheadroom_multiplier: 0.5\nledger: []\n");
    const f = relative(process.cwd(), abs).split("\\").join("/");
    expect(() => loadBudget(f)).toThrow(/headroom_multiplier must be a number >= 1/);
  });
});

describe("the per-row mean is derived from a matching baseline", () => {
  it("reads iter8's real cost for answer.v3 and matches the committed figure", () => {
    const m = meanCostPerRow("answer.v3.md");
    expect(m).not.toBeNull();
    // iter8: $4.07 over 48 rows. The figure is read off the committed report,
    // so this test fails if that report's cost line ever changes.
    expect(m!.usd).toBeCloseTo(4.07 / 48, 4);
    expect(m!.from).toContain("iter8");
  });

  it("does not reuse an answer.v2 baseline for an answer.v3 run", () => {
    const v2 = meanCostPerRow("answer.v2.md");
    const v3 = meanCostPerRow("answer.v3.md");
    expect(v2).not.toBeNull();
    expect(v3).not.toBeNull();
    // v3 replies are longer, so its per-row cost is strictly higher. A v2 mean
    // carried into a v3 estimate would under-state every run.
    expect(v3!.usd).toBeGreaterThan(v2!.usd);
  });

  it("returns null for a prompt version no baseline used", () => {
    expect(meanCostPerRow("answer.v99.md")).toBeNull();
  });
});

describe("estimateRun", () => {
  it("scales with row count and applies the multiplier", () => {
    const b = loadBudget(tempLedger(20));
    const full = estimateRun(48, "answer.v3.md", b);
    const one = estimateRun(1, "answer.v3.md", b);
    expect(full).not.toBeNull();
    expect(full!.total).toBeCloseTo(4.07, 2);
    expect(full!.required).toBeCloseTo(4.07 * 1.5, 2);
    expect(one!.total).toBeCloseTo(4.07 / 48, 4);
  });
});

describe("a zero-cost run leaves the ledger alone", () => {
  it("writes no entry for the 0-row smoke", () => {
    const f = tempLedger(20);
    recordSpend("partial (0 of 48 rows)", 0, f);
    const after = loadBudget(f);
    expect(after.ledger).toEqual([]);
    expect(after.remaining_usd).toBe(20);
  });
});
