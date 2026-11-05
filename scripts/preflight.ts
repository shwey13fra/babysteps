// scripts/preflight.ts
//
// Infrastructure, not an eval feature (human ruling, 2026-11-04): the same
// check runs in front of an eval baseline, Phase 6's /api/ask VERIFY, and any
// ingestion step that embeds.
//
// WHY (ADR-055). API-credit exhaustion has happened three times in nine days:
// 2026-10-27, iter6 on 2026-11-03, iter9 on 2026-11-04. iter9 is the case this
// file is shaped by — it measured rows A-01..A-09, the balance died at A-10,
// and $1.08 bought nothing. A liveness check alone would not have caught it:
// the key was alive at row 1. So there are two gates, and the second is the
// one that matters:
//
//   1. LIVENESS  — a minimal call before the first row. Catches a dead key for
//                  a fraction of a cent.
//   2. COVERAGE  — the estimated cost of the whole run against a declared
//                  remaining balance, times a headroom multiplier. Catches the
//                  row-30 death that liveness cannot see.
//
// There is NO provider endpoint for a remaining balance (checked: the Admin
// API gives spend-to-date and token usage, raw HTTP only, under an admin
// credential this project does not hold; spend limits are an early-access
// preview). Coverage therefore runs against `data/eval-budget.yaml`, which the
// human sets on top-up and the harness decrements from measured cost. That
// limitation is in the file's own header: it tracks our figure, not
// Anthropic's, so a forgotten top-up makes it over-cautious, never
// over-confident.
//
// Run standalone:
//   npx tsx scripts/preflight.ts                 # liveness, both providers
//   npx tsx scripts/preflight.ts --rows 48       # liveness + coverage for 48 rows
//   npx tsx scripts/preflight.ts --embedding     # the embedding key only

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export const BUDGET_FILE = "data/eval-budget.yaml";
const REPORTS_DIR = "eval/reports";

export type Budget = {
  version?: number;
  remaining_usd: number;
  last_topped_up: string | null;
  headroom_multiplier: number;
  ledger: Array<{ date: string; label: string; measured_usd: number; remaining_after: number }>;
};

export function loadBudget(file = BUDGET_FILE): Budget {
  const b = parseYaml(readFileSync(join(process.cwd(), file), "utf8")) as Budget;
  if (typeof b.remaining_usd !== "number" || !Number.isFinite(b.remaining_usd)) {
    throw new Error(`${file}: remaining_usd must be a number`);
  }
  if (typeof b.headroom_multiplier !== "number" || b.headroom_multiplier < 1) {
    throw new Error(`${file}: headroom_multiplier must be a number >= 1`);
  }
  return { ...b, ledger: b.ledger ?? [] };
}

/**
 * Mean cost per measured row, DERIVED from the most recent full baseline that
 * ran the given answer prompt — never hardcoded.
 *
 * The prompt version matters and is not a detail: answer.v3 costs ~10% more
 * per row than v2 ($4.07 against $3.62-3.67 for 48 rows) because the
 * completeness section makes replies longer. An estimate carried over from v2
 * would under-state every v3 run.
 *
 * Only `valid_baseline` reports count. A partial run's mean is computed over
 * rows that were measured, and iter9 shows why that is wrong to reuse: its
 * nine rows were all ANSWER rows, the most expensive kind, so its per-row mean
 * is far above a full run's.
 */
export function meanCostPerRow(answerPrompt: string): { usd: number; from: string } | null {
  const dir = join(process.cwd(), REPORTS_DIR);
  const candidates: Array<{ file: string; usd: number; rows: number }> = [];

  for (const name of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    let r: { meta?: Record<string, unknown> };
    try {
      r = JSON.parse(readFileSync(join(dir, name), "utf8")) as { meta?: Record<string, unknown> };
    } catch {
      continue;
    }
    const m = r.meta;
    if (!m || m.valid_baseline !== true) continue;
    const rows = m.rows_measured;
    if (typeof rows !== "number" || rows <= 0) continue;

    // `cost_usd` and `prompts` were added to meta on 2026-11-04. Reports
    // written before that carry the same figures only in their MARKDOWN, so
    // read it from there rather than back-fill a committed report: the number
    // is already evidence, it was simply not machine-readable. Matching the
    // answer prompt is required either way — v3 costs ~10% more per row than
    // v2, so a v2 mean would under-state every v3 run.
    const md = join(dir, name.replace(/\.json$/, ".md"));
    let cost = typeof m.cost_usd === "number" ? m.cost_usd : null;
    let prompt = (m.prompts as Record<string, string> | undefined)?.answer ?? null;
    if (cost === null || prompt === null) {
      let text: string;
      try {
        text = readFileSync(md, "utf8");
      } catch {
        continue;
      }
      if (cost === null) {
        // "- total: 134 calls — $4.07"
        const hit = text.match(/^- total:.*?\$([\d.]+)\s*$/m);
        if (!hit) continue;
        cost = Number(hit[1]);
      }
      if (prompt === null) {
        const hit = text.match(/prompts `([^`]+)`/);
        if (!hit) continue;
        prompt = hit[1];
      }
    }
    if (!Number.isFinite(cost) || prompt !== answerPrompt) continue;
    candidates.push({ file: name, usd: cost as number, rows });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.file.localeCompare(b.file));
  const latest = candidates[candidates.length - 1];
  return { usd: latest.usd / latest.rows, from: latest.file };
}

export type Estimate = { rows: number; perRow: number; total: number; required: number; from: string };

export function estimateRun(rows: number, answerPrompt: string, budget: Budget): Estimate | null {
  const mean = meanCostPerRow(answerPrompt);
  if (!mean) return null;
  const total = mean.usd * rows;
  return {
    rows,
    perRow: mean.usd,
    total,
    required: total * budget.headroom_multiplier,
    from: mean.from,
  };
}

const usd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Throws BEFORE the first model call when the declared balance will not cover
 * the run with headroom. The message says every number it used, because a gate
 * that blocks a run has to be arguable.
 */
export function assertBudget(est: Estimate | null, budget: Budget, ignore: boolean): void {
  if (!est) {
    console.log(
      `budget     : no comparable full baseline on disk for this answer prompt — coverage NOT checked`,
    );
    return;
  }
  const line =
    `budget     : est ${usd(est.total)} (${est.rows} rows x ${usd(est.perRow)}/row, from ${est.from}), ` +
    `needs ${usd(est.required)} at ${budget.headroom_multiplier}x, declared ${usd(budget.remaining_usd)}`;
  console.log(line);

  if (budget.remaining_usd >= est.required) return;

  if (ignore) {
    console.log(
      `             --ignore-budget: starting anyway. Overriding a refusal that says the ` +
        `declared balance is ${usd(est.required - budget.remaining_usd)} short.`,
    );
    return;
  }

  throw new Error(
    [
      `REFUSING TO START: the declared balance will not cover this run.`,
      `  estimate            ${usd(est.total)}  (${est.rows} rows x ${usd(est.perRow)}/row, derived from ${est.from})`,
      `  required at ${budget.headroom_multiplier}x     ${usd(est.required)}`,
      `  declared remaining  ${usd(budget.remaining_usd)}   (${BUDGET_FILE}, topped up ${budget.last_topped_up ?? "never"})`,
      `  short by            ${usd(est.required - budget.remaining_usd)}`,
      ``,
      `This is the iter9 failure: it spent $1.08 reaching row 10 of 48 and produced no`,
      `baseline. Top up, then set remaining_usd and last_topped_up in ${BUDGET_FILE}.`,
      `To start anyway, pass --ignore-budget.`,
    ].join("\n"),
  );
}

/**
 * Appends the measured cost and decrements the declared balance.
 *
 * A zero-cost run writes nothing. The 0-row smoke (`--only ZZZ-NOT-A-ROW`) is
 * run routinely to exercise the report writer and the validators without
 * spending, and an entry per smoke would bury the real ones in a file whose
 * whole job is to be an audit trail.
 */
export function recordSpend(label: string, measuredUsd: number, file = BUDGET_FILE): void {
  if (!(measuredUsd > 0)) {
    console.log(`budget     : nothing spent, ledger unchanged`);
    return;
  }
  const path = join(process.cwd(), file);
  const raw = readFileSync(path, "utf8");
  const b = loadBudget(file);
  const remainingAfter = Math.max(0, b.remaining_usd - measuredUsd);
  const entry =
    `  - date: ${new Date().toISOString().slice(0, 10)}\n` +
    `    label: ${JSON.stringify(label)}\n` +
    `    measured_usd: ${measuredUsd.toFixed(4)}\n` +
    `    remaining_after: ${remainingAfter.toFixed(2)}\n`;

  let out = raw.replace(
    /^remaining_usd:.*$/m,
    `remaining_usd: ${remainingAfter.toFixed(2)}`,
  );
  out = /^ledger:\s*\[\]\s*$/m.test(out)
    ? out.replace(/^ledger:\s*\[\]\s*$/m, `ledger:\n${entry.trimEnd()}`)
    : `${out.replace(/\s*$/, "")}\n${entry}`;
  writeFileSync(path, out);
  console.log(
    `budget     : recorded ${usd(measuredUsd)} for "${label}" — declared remaining now ${usd(remainingAfter)}`,
  );
}

// --- liveness ---------------------------------------------------------------

export type Liveness = { alive: boolean; provider: string; reason: string };

/**
 * One minimal Messages call. `max_tokens: 1` so a live key costs a fraction of
 * a cent; a dead one costs nothing and returns the reason verbatim, which is
 * how iter9's cause was identified after the fact rather than before it.
 */
export async function anthropicAlive(): Promise<Liveness> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  try {
    await new Anthropic().messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "." }],
    });
    return { alive: true, provider: "anthropic", reason: "ok" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { alive: false, provider: "anthropic", reason: msg.slice(0, 300) };
  }
}

/** The OpenAI embedding key — a different provider with its own cliff (lapses ~2026-11-21). */
export async function embeddingAlive(): Promise<Liveness> {
  const key = process.env.EMBEDDING_API_KEY;
  if (!key) return { alive: false, provider: "embedding", reason: "EMBEDDING_API_KEY is not set" };
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: "." }),
    });
    if (!res.ok) {
      return { alive: false, provider: "embedding", reason: `HTTP ${res.status} ${(await res.text()).slice(0, 200)}` };
    }
    return { alive: true, provider: "embedding", reason: "ok" };
  } catch (e) {
    return { alive: false, provider: "embedding", reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Throws unless the provider is reachable. Called before the first paid call. */
export function assertAlive(l: Liveness): void {
  console.log(`liveness   : ${l.provider} ${l.alive ? "alive" : "DEAD"}${l.alive ? "" : ` — ${l.reason}`}`);
  if (!l.alive) {
    throw new Error(
      [
        `REFUSING TO START: the ${l.provider} API is not usable.`,
        `  ${l.reason}`,
        ``,
        l.provider === "anthropic"
          ? `Top up the Anthropic credit, then set remaining_usd in ${BUDGET_FILE}.`
          : `The embedding key is the other cliff: the free credit lapses ~2026-11-21.`,
      ].join("\n"),
    );
  }
}

// --- CLI --------------------------------------------------------------------

async function main() {
  // Only when run standalone. An importing caller (run.ts, an ingest script)
  // has already loaded its own env before it reaches us.
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }

  const argv = process.argv.slice(2);
  const rowsIdx = argv.indexOf("--rows");
  const rows = rowsIdx === -1 ? null : Number(argv[rowsIdx + 1]);
  const onlyEmbedding = argv.includes("--embedding");
  const answerIdx = argv.indexOf("--answer-prompt");
  const answerPrompt = answerIdx === -1 ? "answer.v4.md" : argv[answerIdx + 1];

  if (onlyEmbedding) {
    assertAlive(await embeddingAlive());
    return;
  }

  assertAlive(await anthropicAlive());
  assertAlive(await embeddingAlive());

  if (rows && Number.isFinite(rows)) {
    const budget = loadBudget();
    assertBudget(estimateRun(rows, answerPrompt, budget), budget, argv.includes("--ignore-budget"));
  }
  console.log("preflight  : OK");
}

// Only run as a script, so run.ts and the probes can import the functions.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/preflight.ts")) {
  main().catch((e) => {
    console.error(`\n${e?.message ?? e}\n`);
    process.exit(1);
  });
}
