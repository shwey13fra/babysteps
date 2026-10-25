// scripts/eval/calibrate.ts
//
// Measures the refusal threshold instead of guessing it.
//
// Runs all 30 ANSWER rows and all 8 REFUSE rows of golden_set_v1.4.csv through
// RETRIEVAL ONLY — no guard, no answer model, no judge — and prints the
// distribution of top cosine for each group. The two distributions are the
// whole point: a threshold is only meaningful if the group we must answer and
// the group we must refuse separate on this number.
//
// Nothing here picks the threshold. A human reads the output and picks it, and
// it is recorded as ADR-009 with these numbers (playbook Phase 3 step 4).
//
// Run: npx tsx scripts/eval/calibrate.ts [--k 8]

import { readFileSync } from "node:fs";
import { join } from "node:path";

// .env.local into process.env before anything reads it. The lib modules read
// env lazily inside their functions, so a static import above this is safe.
for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { retrieve } from "../../lib/rag/retrieve";
import type { Bundesland } from "../../lib/schemas";

const CSV = "data/golden/golden_set_v1.4.csv";

// Private copy, matching the convention in golden-drift.ts and
// verify-golden.ts. Three copies is the point at which this should be
// extracted; that is a refactor to propose, not to smuggle into this phase.
function readCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift()!;
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

/**
 * The jurisdiction filter is derived from bundesland only. Overrides naming a
 * state we do not cover (R-01 'bayern') fall back to the default profile and
 * are marked in the table: the refusal is the expected behaviour there, and it
 * is not retrieval's job to produce it.
 */
function bundeslandFor(override: string): { value: Bundesland; uncovered: string | null } {
  if (!override) return { value: "hessen", uncovered: null };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(override) as Record<string, unknown>;
  } catch {
    return { value: "hessen", uncovered: `unparseable override` };
  }
  const b = parsed.bundesland;
  if (b === "hessen" || b === "berlin") return { value: b, uncovered: null };
  if (typeof b === "string") return { value: "hessen", uncovered: b };
  return { value: "hessen", uncovered: null };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function describe(label: string, values: number[]): void {
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / (s.length || 1);
  console.log(
    `${label.padEnd(8)} n=${String(s.length).padStart(2)}  ` +
    `min ${s[0]?.toFixed(3)}  p10 ${quantile(s, 0.1).toFixed(3)}  p25 ${quantile(s, 0.25).toFixed(3)}  ` +
    `med ${quantile(s, 0.5).toFixed(3)}  p75 ${quantile(s, 0.75).toFixed(3)}  p90 ${quantile(s, 0.9).toFixed(3)}  ` +
    `max ${s[s.length - 1]?.toFixed(3)}  mean ${mean.toFixed(3)}`,
  );
}

function histogram(label: string, values: number[], lo: number, hi: number, step: number): void {
  console.log(`\n${label}`);
  for (let b = lo; b < hi - 1e-9; b += step) {
    const n = values.filter((v) => v >= b && v < b + step).length;
    console.log(`  ${b.toFixed(2)}-${(b + step).toFixed(2)}  ${"#".repeat(n).padEnd(16)} ${n || ""}`);
  }
}

type Measured = {
  id: string;
  category: string;
  bundesland: Bundesland;
  uncovered: string | null;
  topCosine: number;
  topRef: string;
  glossary: number;
};

async function main() {
  const i = process.argv.indexOf("--k");
  const k = i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : 8;

  const rows = readCsv(readFileSync(join(process.cwd(), CSV), "utf8"));
  const targets = rows.filter((r) => r.category === "ANSWER" || r.category === "REFUSE");

  console.log(`\nrefusal-threshold calibration`);
  console.log(`set        : ${CSV}`);
  console.log(`rows       : ${targets.length} (${targets.filter((r) => r.category === "ANSWER").length} ANSWER, ${targets.filter((r) => r.category === "REFUSE").length} REFUSE)`);
  console.log(`retrieval  : top-${k}, embed original question, expanded string as query_text`);
  console.log(`not run    : guard, generate, judge. This is retrieval only.\n`);

  const measured: Measured[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const row of targets) {
    const { value: bundesland, uncovered } = bundeslandFor(row.profile_override);
    try {
      const r = await retrieve(row.question, { bundesland });
      const top = r.hits.length
        ? r.hits.reduce((a, b) => (b.cosine > a.cosine ? b : a))
        : null;
      measured.push({
        id: row.id,
        category: row.category,
        bundesland,
        uncovered,
        topCosine: r.topCosine,
        topRef: top ? (top.section_ref || top.doc_title || "(untitled)") : "(no rows)",
        glossary: r.expansion.matched.length,
      });
      process.stdout.write(".");
    } catch (e) {
      failed.push({ id: row.id, error: (e as Error)?.message ?? String(e) });
      process.stdout.write("x");
    }
  }
  console.log("\n");

  // The denominator beside the verdict: a distribution computed from fewer rows
  // than were attempted is a different claim from one computed from all of them.
  console.log(`attempted ${targets.length} · measured ${measured.length} · failed ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAILED ${f.id}: ${f.error}`);
    console.log(`\nThe distributions below describe only the rows that were measured.`);
  }
  if (measured.length === 0) {
    console.log(`\nNothing was measured. There is no distribution to read and no threshold to pick.`);
    process.exit(1);
  }

  const answer = measured.filter((m) => m.category === "ANSWER");
  const refuse = measured.filter((m) => m.category === "REFUSE");

  console.log(`\nper row\n`);
  console.log(`id     cat     land     top cos  gloss  top hit`);
  console.log("-".repeat(86));
  for (const m of [...answer, ...refuse]) {
    console.log(
      `${m.id.padEnd(6)} ${m.category.padEnd(7)} ${m.bundesland.padEnd(8)} ` +
      `${m.topCosine.toFixed(3).padStart(7)}  ${String(m.glossary).padStart(5)}  ${m.topRef.slice(0, 44)}` +
      (m.uncovered ? `   [override '${m.uncovered}' not covered -> default profile]` : ""),
    );
  }

  console.log(`\n\ndistribution of top cosine\n`);
  describe("ANSWER", answer.map((m) => m.topCosine));
  describe("REFUSE", refuse.map((m) => m.topCosine));

  const all = measured.map((m) => m.topCosine);
  const lo = Math.floor(Math.min(...all) * 20) / 20;
  const hi = Math.ceil(Math.max(...all) * 20) / 20;
  histogram(`ANSWER (${answer.length})`, answer.map((m) => m.topCosine), lo, hi, 0.05);
  histogram(`REFUSE (${refuse.length})`, refuse.map((m) => m.topCosine), lo, hi, 0.05);

  // Same two distributions, read as the decision actually gets made. A
  // threshold trades one error against the other; this is where that trade is
  // visible instead of inferred from quantiles.
  console.log(`\n\nwhat each threshold would cost\n`);
  console.log(`  t      ANSWER wrongly refused      REFUSE wrongly let through`);
  console.log("-".repeat(70));
  const answerMin = Math.min(...answer.map((m) => m.topCosine));
  const refuseMax = Math.max(...refuse.map((m) => m.topCosine));
  for (let t = lo; t <= hi + 1e-9; t += 0.02) {
    const wronglyRefused = answer.filter((m) => m.topCosine < t);
    const wronglyAnswered = refuse.filter((m) => m.topCosine >= t);
    console.log(
      `  ${t.toFixed(2)}   ${String(wronglyRefused.length).padStart(2)}/${answer.length}  ${wronglyRefused.map((m) => m.id).join(" ").slice(0, 22).padEnd(24)}  ` +
      `${String(wronglyAnswered.length).padStart(2)}/${refuse.length}  ${wronglyAnswered.map((m) => m.id).join(" ").slice(0, 22)}`,
    );
  }

  console.log(`\n\nseparation`);
  console.log(`  lowest  ANSWER top cosine : ${answerMin.toFixed(3)}  (${answer.find((m) => m.topCosine === answerMin)?.id})`);
  console.log(`  highest REFUSE top cosine : ${refuseMax.toFixed(3)}  (${refuse.find((m) => m.topCosine === refuseMax)?.id})`);
  console.log(
    answerMin > refuseMax
      ? `  the groups separate cleanly; any t in (${refuseMax.toFixed(3)}, ${answerMin.toFixed(3)}] costs nothing on this set`
      : `  the groups OVERLAP by ${(refuseMax - answerMin).toFixed(3)}; every threshold costs something, and the table above is the trade`,
  );

  console.log(`\n\nwhat this does not tell you`);
  console.log(`  - cosine says a chunk is topically close, not that it answers the question.`);
  console.log(`    A high score on a wrong chunk is still wrong; that is Phase 4's hit rate.`);
  console.log(`  - 8 REFUSE rows is a small sample. A threshold tuned to separate them exactly`);
  console.log(`    is tuned to 8 questions, not to the class of out-of-scope questions.`);
  console.log(`  - DEFLECT rows are absent by design: the medical guard runs before retrieval,`);
  console.log(`    so no threshold protects them and none should be asked to.\n`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
