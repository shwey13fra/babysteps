// scripts/eval/probe-completion.ts
//
// Does section completion actually put the missing Absätze in front of the
// model? One embedding call per question, NO model call — so this answers the
// iteration's central question before any eval spend (ADR-032).
//
// A-16's critical read: "the supplied SGB V §10 excerpt stops at §10(2) item 1
// and contains no §10(3)". A-18's: "the only supplied §24i excerpt is
// subsection (5)". Both sections exist whole in the corpus.
//
// Run: npx tsx scripts/eval/probe-completion.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { retrieve, EXCERPT_TOKEN_BUDGET } from "../../lib/rag/retrieve";
import type { ChunkHit } from "../../lib/supabase/server";

const CASES = [
  { id: "A-16", question: "How do we insure the baby after the birth?", want: "SGB V §10" },
  { id: "A-18", question: "What is Mutterschaftsgeld and when do I apply for it?", want: "SGB V §24i" },
];

/** Absatz markers "(1)" style, at a line start or after whitespace. */
function markers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(?:^|\s)\((\d{1,2})\)/g)) {
    const n = Number(m[1]);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

const markerStr = (content: string) => "[" + markers(content).join(" ") + "]";
const est = (chunks: ChunkHit[]) =>
  Math.ceil(chunks.reduce((n, h) => n + h.content.length, 0) / 3.5);

async function main() {
  console.log(`token budget: ${EXCERPT_TOKEN_BUDGET} (ADR-032)\n`);

  let rankedTokens = 0;
  let shownTokens = 0;

  for (const c of CASES) {
    const r = await retrieve(c.question, { bundesland: "hessen" });

    rankedTokens += est(r.ranked);
    shownTokens += est(r.hits);

    console.log(`======== ${c.id}  "${c.question}"`);
    console.log(`  ranked ${r.ranked.length} chunks, shown ${r.hits.length}, added ${r.completion.added.length}`);
    console.log(`  est tokens: ranked ${est(r.ranked)} -> shown ${est(r.hits)}`);
    if (r.completion.budgetSkipped.length)
      console.log(`  BUDGET SKIPPED: ${r.completion.budgetSkipped.join(", ")}`);
    if (r.completion.nonContiguous.length)
      console.log(`  non-contiguous (completion refused): ${r.completion.nonContiguous.join(", ")}`);

    const before = r.ranked.filter((h) => h.section_ref === c.want);
    const after = r.hits.filter((h) => h.section_ref === c.want);
    console.log(`  ${c.want}:`);
    console.log(`    ranked: ${before.length ? before.map((h) => h.id + markerStr(h.content)).join(" ") : "(not retrieved)"}`);
    console.log(`    shown : ${after.length ? after.map((h) => h.id + markerStr(h.content)).join(" ") : "(not shown)"}`);

    const absBefore = new Set(before.flatMap((h) => markers(h.content)));
    const absAfter = new Set(after.flatMap((h) => markers(h.content)));
    const gained = [...absAfter].filter((n) => !absBefore.has(n)).sort((a, b) => a - b);
    console.log(`    Absätze gained: ${gained.length ? gained.join(", ") : "NONE"}`);
    console.log("");
  }

  console.log("==== token delta across both probes ====");
  console.log(
    `ranked ${rankedTokens} -> shown ${shownTokens}  (+${shownTokens - rankedTokens}, ` +
      `+${((shownTokens / rankedTokens - 1) * 100).toFixed(1)}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
