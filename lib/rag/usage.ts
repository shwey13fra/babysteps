// Token and cost meter for the model calls this app makes.
//
// Why it exists: the eval harness makes three model calls per golden row, and
// before this module nothing recorded what any of them cost. Spend could only
// ever be estimated after the fact, never reported. Phase 5 is the
// iteration-heavy phase, so the number matters.
//
// It only reads `response.usage`. It never decides anything, never throws, and
// the callers ignore its return value, so a bug in here cannot change a
// verdict, a score, or an answer. `record` is called before the callers' early
// returns, so a refused, truncated or unparseable response is still billed and
// still counted — those are the calls most likely to be silently dropped.
//
// Prices are USD per million tokens, first-party Anthropic API rates. Haiku
// 5.5's rates below apply to prompts up to 100K tokens; this app's judge and
// guard prompts are ~4K, so the higher band is not reachable here.
const PER_MTOK: Record<string, { input: number; output: number; cacheRead?: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** The fields of the SDK's usage object this module reads. All optional. */
export type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export type Tally = {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

const tallies = new Map<string, Tally>();

function blank(): Tally {
  return { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Adds one call to the tally. Never throws: it is instrumentation sitting
 * inside callers whose catch block turns any error into a failed row.
 */
export function record(model: string, usage: UsageLike | null | undefined): void {
  try {
    const t = tallies.get(model) ?? blank();
    t.calls += 1;
    t.input += num(usage?.input_tokens);
    t.output += num(usage?.output_tokens);
    t.cacheRead += num(usage?.cache_read_input_tokens);
    t.cacheWrite += num(usage?.cache_creation_input_tokens);
    tallies.set(model, t);
  } catch {
    /* a meter must not be able to fail the thing it measures */
  }
}

/**
 * USD for one tally. A cache read on a model with no published cache rate in
 * the table above is priced at the full input rate — an overestimate, chosen so
 * an unpriced read can never make a run look cheaper than it was.
 */
export function costUsd(model: string, t: Tally): number {
  const p = PER_MTOK[model];
  if (!p) return 0;
  const cacheReadRate = p.cacheRead ?? p.input;
  return (
    (t.input * p.input +
      t.output * p.output +
      t.cacheRead * cacheReadRate +
      // A cache write bills at 1.25x the input rate.
      t.cacheWrite * p.input * 1.25) /
    1_000_000
  );
}

export type Snapshot = {
  perModel: { model: string; tally: Tally; usd: number; priced: boolean }[];
  totalUsd: number;
  calls: number;
  /** Models that were called but are absent from the price table. */
  unpriced: string[];
};

export function snapshot(): Snapshot {
  const perModel = [...tallies.entries()]
    .map(([model, tally]) => ({
      model,
      tally,
      usd: costUsd(model, tally),
      priced: Boolean(PER_MTOK[model]),
    }))
    .sort((a, b) => b.usd - a.usd);

  return {
    perModel,
    totalUsd: perModel.reduce((s, m) => s + m.usd, 0),
    calls: perModel.reduce((s, m) => s + m.tally.calls, 0),
    unpriced: perModel.filter((m) => !m.priced).map((m) => m.model),
  };
}

export function reset(): void {
  tallies.clear();
}

/**
 * Human-readable lines, used by the eval harness for both the console and the
 * committed report. Returns [] when nothing was recorded, so a caller can tell
 * "no model calls" from "zero cost".
 */
export function formatUsage(s: Snapshot = snapshot()): string[] {
  if (!s.calls) return [];
  const lines = s.perModel.map((m) => {
    const t = m.tally;
    const cache = t.cacheRead || t.cacheWrite ? `, cache ${t.cacheRead} r / ${t.cacheWrite} w` : "";
    const usd = m.priced ? `$${m.usd.toFixed(4)}` : "unpriced";
    return `${m.model}: ${t.calls} calls, ${t.input} in / ${t.output} out${cache} — ${usd}`;
  });
  lines.push(`total: ${s.calls} calls — $${s.totalUsd.toFixed(2)}`);
  if (s.unpriced.length) {
    lines.push(`NOT PRICED (absent from the table in lib/rag/usage.ts): ${s.unpriced.join(", ")}`);
  }
  return lines;
}
