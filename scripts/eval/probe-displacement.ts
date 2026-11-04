// scripts/eval/probe-displacement.ts
//
// The displacement pre-check that iteration 5 owes before it buys a baseline
// (knowledge/plans/2026-10-31-iteration-5-source-url-completion.md, section
// "The displacement regression check").
//
// The question: turning COMPLETE_SECTIONS on expands excerpts inside a FIXED
// EXCERPT_TOKEN_BUDGET. Can a chunk that earned its place with completion off
// be crowded out with completion on? If so, a row that passed can regress, and
// the human required both numbers -- gained AND lost -- before the commit.
//
// One embedding call per row, NO model call.
//
// Method note, and the reason this costs one embedding per row instead of two:
// `ranked` is produced before completion is consulted -- same embedding, same
// match, same TOP_K either way. Only the sibling pool differs. So the
// completion-off `hits` list is `completeSections(ranked, [])`, computed
// locally from the same retrieval. That removes re-embedding variance as a
// confounder rather than merely hoping it is small.
//
// Run: npx tsx scripts/eval/probe-displacement.ts [--category ANSWER]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { retrieve, completeSections, EXCERPT_TOKEN_BUDGET } from "../../lib/rag/retrieve";
import type { ChunkHit } from "../../lib/supabase/server";
import type { Bundesland } from "../../lib/schemas";
import { readCsv } from "./csv";
import { todayISO } from "../../lib/timeline/dates";

const CSV = "data/golden/golden_set_v1.10.csv";
const GOLDEN_VERSION = "v1.10";
// Was `const TODAY = "2026-11-02"`. A hardcoded date in an output path does not
// date the report, it names ONE file that every later run overwrites: running
// this probe on 2026-11-03 silently replaced the committed 2026-11-02 report
// and its .json, which is the failure 57c1428 ("a report is evidence") exists
// to prevent. `todayISO()` is the project helper four sibling eval scripts
// already use, so this file now dates itself the same way they do.

/** Sixth copy. calibrate.ts:32 already flags the extraction as owed (CLAUDE.md rule 1). */
function bundeslandFor(override: string): Bundesland {
  if (!override) return "hessen";
  try {
    const b = (JSON.parse(override) as Record<string, unknown>).bundesland;
    if (b === "hessen" || b === "berlin") return b;
  } catch {
    // Unparseable: run.ts:142 falls back to the default too.
  }
  return "hessen";
}

const est = (chunks: ChunkHit[]) =>
  Math.ceil(chunks.reduce((n, h) => n + h.content.length, 0) / 3.5);

type RowResult = {
  id: string;
  category: string;
  bundesland: Bundesland;
  rankedN: number;
  offN: number;
  onN: number;
  added: number[];
  dropped: number[];
  offTokens: number;
  onTokens: number;
  budgetSkipped: string[];
  nonContiguous: string[];
  /** Ranked hits with no section_ref: outside completion today, step (b) pool. */
  guidanceRanked: number;
};

async function main() {
  const arg = process.argv.indexOf("--category");
  const onlyCategory = arg === -1 ? null : process.argv[arg + 1];

  const all = readCsv(readFileSync(join(process.cwd(), CSV), "utf8"));
  const rows = onlyCategory ? all.filter((r) => r.category === onlyCategory) : all;

  console.log(
    `golden ${GOLDEN_VERSION} - ${rows.length} rows${onlyCategory ? ` (${onlyCategory} only)` : ""}`,
  );
  console.log(`budget ${EXCERPT_TOKEN_BUDGET} est. tokens (ADR-032) - no model calls\n`);

  const results: RowResult[] = [];

  for (const row of rows) {
    const bundesland = bundeslandFor(row.profile_override);

    // Completion ON. This is the production path (retrieve.ts defaults it true).
    const on = await retrieve(row.question, { bundesland });

    // Completion OFF, from the SAME ranked list -- pure, no second round-trip.
    const off = completeSections(on.ranked, []);

    const onIds = on.hits.map((h) => h.id);
    const offIds = off.hits.map((h) => h.id);
    const added = onIds.filter((id) => !offIds.includes(id));
    const dropped = offIds.filter((id) => !onIds.includes(id));

    const r: RowResult = {
      id: row.id,
      category: row.category,
      bundesland,
      rankedN: on.ranked.length,
      offN: off.hits.length,
      onN: on.hits.length,
      added,
      dropped,
      offTokens: est(off.hits),
      onTokens: est(on.hits),
      budgetSkipped: on.completion.budgetSkipped,
      nonContiguous: on.completion.nonContiguous,
      guidanceRanked: on.ranked.filter((h) => !h.section_ref).length,
    };
    results.push(r);

    console.log(
      `${r.id.padEnd(5)} ${r.category.padEnd(7)} ${r.bundesland.padEnd(6)}` +
        ` hits ${String(r.offN).padStart(2)}->${String(r.onN).padStart(2)}` +
        ` tok ${String(r.offTokens).padStart(5)}->${String(r.onTokens).padStart(5)}` +
        ` +[${r.added.join(" ")}]` +
        (r.budgetSkipped.length ? ` SKIPPED:${r.budgetSkipped.join(",")}` : "") +
        (r.guidanceRanked ? ` guidance:${r.guidanceRanked}/${r.rankedN}` : "") +
        (r.dropped.length ? "  ** DROPPED **" : ""),
    );
  }

  // ---- totals -------------------------------------------------------------

  const dropRows = results.filter((r) => r.dropped.length);
  const gainRows = results.filter((r) => r.added.length);
  const skipRows = results.filter((r) => r.budgetSkipped.length);
  const atBudget = results.filter((r) => r.onTokens >= EXCERPT_TOKEN_BUDGET);
  const nonContig = results.filter((r) => r.nonContiguous.length);
  const totalAdded = results.reduce((n, r) => n + r.added.length, 0);
  const offTok = results.reduce((n, r) => n + r.offTokens, 0);
  const onTok = results.reduce((n, r) => n + r.onTokens, 0);

  console.log(`\n== totals over ${results.length} rows`);
  console.log(`rows gaining a chunk:        ${gainRows.length}`);
  console.log(`rows DROPPING a chunk:       ${dropRows.length}`);
  console.log(
    `rows hitting the budget:     ${skipRows.length} gave up a completion, ${atBudget.length} at/over budget`,
  );
  console.log(`rows with non-contiguous §:  ${nonContig.length}`);
  console.log(`chunks added, total:         ${totalAdded}`);
  console.log(`est. tokens, off -> on:      ${offTok} -> ${onTok}`);

  const growth = results
    .map((r) => (r.offTokens ? r.onTokens / r.offTokens : 1))
    .sort((a, b) => b - a);
  console.log(
    `per-row growth factor:       max ${growth[0]?.toFixed(2)}x, median ${growth[Math.floor(growth.length / 2)]?.toFixed(2)}x`,
  );

  const guidanceOnly = results.filter((r) => r.rankedN > 0 && r.guidanceRanked === r.rankedN);
  console.log(
    `rows whose ranked list is ALL guidance (step b pool): ${guidanceOnly.length}` +
      (guidanceOnly.length ? ` -- ${guidanceOnly.map((r) => r.id).join(", ")}` : ""),
  );

  // ---- report -------------------------------------------------------------

  const esc = (s: string) => s.replace(/\|/g, "\\|");
  const L: string[] = [];
  L.push("# Displacement pre-check — section completion OFF vs ON");
  L.push("");
  L.push(
    `Date ${todayISO()} · golden ${GOLDEN_VERSION} · ${results.length} rows · budget ${EXCERPT_TOKEN_BUDGET} est. tokens`,
  );
  L.push("Retrieval only. **No model calls.** One embedding per row.");
  L.push("");
  L.push("Both lists come from one retrieval per row: `ranked` is fixed before completion is");
  L.push("consulted, so the OFF list is `completeSections(ranked, [])` computed locally.");
  L.push("Re-embedding variance is excluded by construction, not assumed away.");
  L.push("");
  L.push("## Result");
  L.push("");
  L.push("| | rows |");
  L.push("| --- | --- |");
  L.push(`| gained at least one chunk | ${gainRows.length} / ${results.length} |`);
  L.push(`| **dropped at least one chunk** | **${dropRows.length} / ${results.length}** |`);
  L.push(`| gave up a completion to the budget | ${skipRows.length} |`);
  L.push(`| at or over the token budget | ${atBudget.length} |`);
  L.push(`| non-contiguous § seen | ${nonContig.length} |`);
  L.push(`| chunks added, total | ${totalAdded} |`);
  L.push(`| est. tokens, off → on | ${offTok} → ${onTok} |`);
  L.push("");
  L.push("## Per row");
  L.push("");
  L.push(
    "| id | cat | land | hits off→on | est. tokens off→on | added | dropped | budget-skipped | guidance in ranked |",
  );
  L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of results) {
    L.push(
      `| ${r.id} | ${r.category} | ${r.bundesland} | ${r.offN}→${r.onN} | ${r.offTokens}→${r.onTokens} |` +
        ` ${r.added.length ? r.added.join(" ") : "—"} |` +
        ` ${r.dropped.length ? `**${r.dropped.join(" ")}**` : "—"} |` +
        ` ${r.budgetSkipped.length ? esc(r.budgetSkipped.join(", ")) : "—"} |` +
        ` ${r.guidanceRanked}/${r.rankedN} |`,
    );
  }
  L.push("");

  mkdirSync(join(process.cwd(), "eval/reports"), { recursive: true });
  // Date from the clock, plus run.ts's suffix so a SECOND run on the same day
  // cannot overwrite the first either. Both halves are needed: the date stops
  // tomorrow's run clobbering today's, the suffix stops today's second run
  // clobbering today's first.
  const base = `eval/reports/${todayISO()}-displacement-precheck`;
  let suffix = "";
  for (let i = 2; existsSync(join(process.cwd(), `${base}${suffix}.md`)); i++) suffix = `-${i}`;
  if (suffix) console.log(`note: ${base}.md exists, writing ${base}${suffix}.md instead`);
  const stem = `${base}${suffix}`;
  writeFileSync(join(process.cwd(), `${stem}.md`), L.join("\n") + "\n");
  writeFileSync(
    join(process.cwd(), `${stem}.json`),
    JSON.stringify({ budget: EXCERPT_TOKEN_BUDGET, golden: GOLDEN_VERSION, results }, null, 2) + "\n",
  );
  console.log(`\nwrote ${stem}.md and .json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
