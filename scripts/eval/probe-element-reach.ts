// scripts/eval/probe-element-reach.ts
//
// For a named golden row, is the chunk that CARRIES a specific missing element
// in the ranked top-8 — and if not, where is it?
//
// WHY. Coverage is measured per element, but retrieval is measured per row, so a
// row can score `retrievalHit: true` on its primary § while the chunk carrying
// an uncovered element sits at rank 23. `probe-refusal` and `probe-completion`
// answer neither question: one is about the floor, the other about siblings.
// This is the instrument for a retrieval/glossary iteration, and it is the
// reason such an iteration can be verified BEFORE buying a baseline.
//
// Targets are declared below rather than passed in, so a run is reproducible
// and the regex that defines "the carrying chunk" is reviewable rather than
// improvised at the shell. Each one is a missing element from
// eval/reports/2026-11-03-variance-3.json with the phrase that must appear in
// the chunk that could satisfy it.
//
// ONE EMBEDDING PER ROW, NO MODEL CALL.
//
// Run: npx tsx scripts/eval/probe-element-reach.ts [--row A-20]

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { retrieve } from "../../lib/rag/retrieve";
import { expandQuery } from "../../lib/rag/expand";
import type { Bundesland } from "../../lib/schemas";
import { readCsv } from "./csv";

const CSV = "data/golden/golden_set_v1.9.csv";

/** Seventh copy. calibrate.ts:32 already flags the extraction as owed. */
function bundeslandFor(override: string): Bundesland {
  if (!override) return "hessen";
  try {
    const b = (JSON.parse(override) as Record<string, unknown>).bundesland;
    if (b === "hessen" || b === "berlin") return b;
  } catch {
    /* run.ts falls back to the default too */
  }
  return "hessen";
}

type Target = { row: string; element: string; carries: RegExp };

const TARGETS: Target[] = [
  // A-13 — PStV §33 ranks 2, but these two are in GUIDANCE chunks, not the statute.
  { row: "A-13", element: "residence registration", carries: /Meldebescheinigung|Einwohnermeldeamt/i },
  { row: "A-13", element: "certified translations / legalisation", carries: /(Ü|Ue)bersetzung|Legalisation|Apostille/i },

  // A-20 — "free at the Jugendamt" is deliberately NOT here: 0 chunks in the
  // corpus carry it, so it is an ingestion question, not a retrieval one.
  { row: "A-20", element: "declared at Jugendamt or notary", carries: /(Urkundsperson|Notar)/i },
  { row: "A-20", element: "possible before the birth", carries: /Sorgeerkl(ä|ae)rung[^.]{0,160}(vor der Geburt|schon vor)/i },

  // A-21 — retrievalHit false. Both elements sit in one BEEG guidance document.
  { row: "A-21", element: "HÄVS / Ämter für Versorgung und Soziales", carries: /(Ä|Ae)mter f(ü|ue)r Versorgung|H(Ä|AE)VS/i },
  { row: "A-21", element: "Fachaufsicht at RP Gießen", carries: /Fachaufsicht/i },

  // A-23 — retrievalHit false, refused low_confidence in earlier runs.
  { row: "A-23", element: "ElterngeldDigital ten-state list", carries: /ElterngeldDigital/i },

  // A-30 — the AO §139a/b route ADR-044 said is "reachable but not by A-30's own question".
  { row: "A-30", element: "tax ID arrives by post", carries: /Identifikationsnummer/i },
];

async function main() {
  const idx = process.argv.indexOf("--row");
  const only = idx === -1 ? null : process.argv[idx + 1];

  const rows = readCsv(readFileSync(join(process.cwd(), CSV), "utf8"));
  const wanted = [...new Set(TARGETS.map((t) => t.row))].filter((r) => (only ? r === only : true));

  console.log(`golden ${CSV} · one embedding per row, no model calls\n`);

  let reached = 0;
  let total = 0;

  for (const id of wanted) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      console.log(`${id}: not in ${CSV}`);
      continue;
    }
    const bundesland = bundeslandFor(row.profile_override);
    const exp = expandQuery(row.question);
    const r = await retrieve(row.question, { bundesland });

    console.log(`=== ${id} — "${row.question}"`);
    console.log(`    glossary fired : ${exp.matched.length ? exp.matched.map((t) => t.de).join(", ") : "NOTHING"}`);
    console.log(`    ranked ${r.ranked.length}, shown ${r.hits.length}, top cosine ${Math.max(...r.ranked.map((h) => h.cosine)).toFixed(4)}`);

    for (const t of TARGETS.filter((x) => x.row === id)) {
      total += 1;
      const inRanked = r.ranked.findIndex((h) => t.carries.test(h.content));
      const inShown = r.hits.findIndex((h) => t.carries.test(h.content));
      if (inRanked !== -1) reached += 1;
      const where =
        inRanked === -1
          ? "NOT in the ranked top-8"
          : `ranked #${inRanked + 1}${inShown === -1 ? " (ranked but NOT shown to the model)" : " and shown"}`;
      console.log(`    [${inRanked !== -1 ? "OK  " : "MISS"}] ${t.element.padEnd(40)} ${where}`);
    }
    console.log();
  }

  console.log(`carrying chunk in the ranked top-8: ${reached}/${total} target elements`);
  console.log(`A MISS here is a retrieval problem. An element whose chunk IS ranked and shown`);
  console.log(`is a PROMPT problem, because the model had the text and did not use it.`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
