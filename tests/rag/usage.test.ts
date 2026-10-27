// The token and cost meter.
//
// The house rule applies: a checker that cannot fail is not a check. Every
// price assertion below is a hand-computed figure, so a wrong rate in the
// table fails the test rather than being echoed back by it. The meter's one
// hard requirement — that it can never throw into the caller it instruments —
// is driven by feeding it the shapes a real failure produces: no usage object
// at all, null fields, and a model nobody priced.

import { beforeEach, describe, expect, it } from "vitest";
import { costUsd, formatUsage, record, reset, snapshot, type Tally } from "../../lib/rag/usage";

function tally(over: Partial<Tally> = {}): Tally {
  return { calls: 1, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ...over };
}

describe("costUsd", () => {
  it("prices Opus 5.5 at $4 in / $20 out per million", () => {
    // 1M in = $4.00, 1M out = $20.00 → $24.00
    expect(costUsd("claude-opus-5-5", tally({ input: 1_000_000, output: 1_000_000 }))).toBeCloseTo(24, 6);
  });

  it("prices Haiku 5.5 at $0.10 in / $0.50 out per million", () => {
    expect(costUsd("claude-haiku-5-5", tally({ input: 1_000_000, output: 1_000_000 }))).toBeCloseTo(0.6, 6);
  });

  it("prices one realistic eval row's answer call", () => {
    // 7,100 in + 1,500 out on Opus 5.5:
    // 7100 * 4/1e6 = 0.0284 ; 1500 * 20/1e6 = 0.030 → 0.0584
    expect(costUsd("claude-opus-5-5", tally({ input: 7_100, output: 1_500 }))).toBeCloseTo(0.0584, 6);
  });

  it("prices an Opus cache read at $0.20, not the $4 input rate", () => {
    expect(costUsd("claude-opus-5-5", tally({ cacheRead: 1_000_000 }))).toBeCloseTo(0.2, 6);
  });

  it("falls back to the input rate for a cache read on a model with no published cache rate", () => {
    // Haiku 5.5 has no cacheRead entry, so a read is priced at input ($0.10),
    // which overestimates. It must never price at zero.
    expect(costUsd("claude-haiku-5-5", tally({ cacheRead: 1_000_000 }))).toBeCloseTo(0.1, 6);
  });

  it("prices a cache write at 1.25x the input rate", () => {
    expect(costUsd("claude-opus-5-5", tally({ cacheWrite: 1_000_000 }))).toBeCloseTo(5, 6);
  });

  it("returns 0 for a model absent from the price table", () => {
    expect(costUsd("claude-not-a-model", tally({ input: 1_000_000, output: 1_000_000 }))).toBe(0);
  });
});

describe("record", () => {
  beforeEach(reset);

  it("accumulates across calls and keeps models apart", () => {
    record("claude-opus-5-5", { input_tokens: 100, output_tokens: 10 });
    record("claude-opus-5-5", { input_tokens: 200, output_tokens: 20 });
    record("claude-haiku-5-5", { input_tokens: 50, output_tokens: 5 });

    const s = snapshot();
    expect(s.calls).toBe(3);

    const opus = s.perModel.find((m) => m.model === "claude-opus-5-5");
    expect(opus?.tally).toMatchObject({ calls: 2, input: 300, output: 30 });

    const haiku = s.perModel.find((m) => m.model === "claude-haiku-5-5");
    expect(haiku?.tally).toMatchObject({ calls: 1, input: 50, output: 5 });
  });

  it("counts a call whose usage is missing or null-valued, rather than dropping it", () => {
    // This is the shape a refused or truncated response can arrive in. The call
    // was still billed, so it must still appear in the call count.
    record("claude-opus-5-5", undefined);
    record("claude-opus-5-5", null);
    record("claude-opus-5-5", { input_tokens: null, output_tokens: undefined });

    const s = snapshot();
    expect(s.calls).toBe(3);
    expect(s.perModel[0].tally).toMatchObject({ calls: 3, input: 0, output: 0 });
  });

  it("ignores non-finite token counts instead of poisoning the total with NaN", () => {
    record("claude-opus-5-5", { input_tokens: Number.NaN, output_tokens: Number.POSITIVE_INFINITY });
    expect(snapshot().totalUsd).toBe(0);
  });

  it("reports an unpriced model instead of silently costing nothing", () => {
    record("claude-not-a-model", { input_tokens: 1_000_000, output_tokens: 1_000_000 });
    const s = snapshot();
    expect(s.unpriced).toEqual(["claude-not-a-model"]);
    expect(formatUsage(s).join("\n")).toContain("NOT PRICED");
  });
});

describe("formatUsage", () => {
  beforeEach(reset);

  it("returns [] when no call was recorded, so 'no calls' is distinguishable from '$0'", () => {
    expect(formatUsage()).toEqual([]);
  });

  it("names each model, its calls and the total", () => {
    record("claude-opus-5-5", { input_tokens: 7_100, output_tokens: 1_500 });
    record("claude-haiku-5-5", { input_tokens: 3_550, output_tokens: 1_200 });

    const lines = formatUsage();
    expect(lines[0]).toContain("claude-opus-5-5: 1 calls, 7100 in / 1500 out");
    expect(lines.at(-1)).toMatch(/^total: 2 calls — \$0\.06$/);
  });

  it("shows cache columns only when there was cache traffic", () => {
    record("claude-opus-5-5", { input_tokens: 10, output_tokens: 1 });
    expect(formatUsage()[0]).not.toContain("cache");

    reset();
    record("claude-opus-5-5", { input_tokens: 10, output_tokens: 1, cache_read_input_tokens: 5 });
    expect(formatUsage()[0]).toContain("cache 5 r / 0 w");
  });
});
