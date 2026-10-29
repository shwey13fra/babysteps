// scripts/eval/probe-refusal.ts
//
// Which rows take the below-the-floor branch, and does the branch still fall
// where it fell before? One embedding call per question, NO answer-model call,
// so the blast radius of iteration 3 is confirmed before any eval spend.
//
// The claim under test (iteration 3 plan §2.1): exactly six golden rows sit
// below REFUSAL_MIN_TOP_COSINE — R-02, R-03, R-04, R-07, A-24, A-26 — and no
// others can be affected by the change. If a seventh row appears here, the
// plan's blast radius is wrong and the predictions in §6 cannot be read.
//
// Run: npx tsx scripts/eval/probe-refusal.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { isLowConfidence, REFUSAL_MIN_TOP_COSINE } from "../../lib/rag/guards";
import { retrieve } from "../../lib/rag/retrieve";
import { readCsv } from "./csv";

const GOLDEN = join(process.cwd(), "data/golden/golden_set_v1.6.csv");

// The rows the plan predicts are below the floor, from the judgefix run's
// recorded topCosine. Asserted, not assumed: a re-ingest moves cosine and
// nothing else reports it (ADR-009).
const PREDICTED_BELOW = ["R-02", "R-03", "R-04", "R-07", "A-24", "A-26"];

// Every row the probe measures: the eight REFUSE rows, plus the two ANSWER
// rows the floor already refuses. A-12 is here because its query returns zero
// chunks, which is now its own branch.
const PROBE = [...PREDICTED_BELOW, "R-01", "R-05", "R-06", "R-08", "A-12"];

/**
 * run.ts:145-146: only hessen and berlin are supported, so R-01's bayern
 * override falls back to the default profile. Mirrored here so the probe
 * retrieves what the eval retrieves.
 */
const BUNDESLAND = "hessen" as const;

async function main() {
  const rows = readCsv(readFileSync(GOLDEN, "utf8")).filter((r) => PROBE.includes(r.id));
  const missing = PROBE.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) throw new Error(`golden v1.6 has no row for ${missing.join(", ")}`);

  console.log(`threshold ${REFUSAL_MIN_TOP_COSINE} (ADR-009) · profile ${BUNDESLAND} · no answer-model call\n`);
  console.log(`id    cat     cosine  chunks  branch`);

  const below: string[] = [];
  const empty: string[] = [];

  for (const id of PROBE) {
    const row = rows.find((r) => r.id === id)!;
    const r = await retrieve(row.question, { bundesland: BUNDESLAND });

    const isEmpty = r.ranked.length === 0;
    const low = isLowConfidence(r.ranked, REFUSAL_MIN_TOP_COSINE);
    if (isEmpty) empty.push(id);
    else if (low) below.push(id);

    const branch = isEmpty
      ? "EMPTY     -> constant, model not called"
      : low
        ? "BELOW     -> model writes the refusal"
        : "above     -> unchanged";

    console.log(
      `${id.padEnd(5)} ${row.category.padEnd(7)} ${r.topCosine.toFixed(3)}   ${String(r.ranked.length).padEnd(6)}  ${branch}`,
    );
  }

  console.log(`\nbelow the floor : ${below.join(", ") || "(none)"}`);
  console.log(`empty retrieval : ${empty.join(", ") || "(none)"}`);

  const expected = PREDICTED_BELOW.filter((id) => !empty.includes(id)).sort().join(",");
  const actual = below.slice().sort().join(",");
  if (expected === actual) {
    console.log(`\nOK — blast radius is exactly the ${below.length} rows the plan predicted.`);
  } else {
    console.log(`\nMISMATCH — predicted [${expected}], measured [${actual}].`);
    console.log(`The plan's §2.1 blast radius is wrong. Do not buy the run on these predictions.`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
