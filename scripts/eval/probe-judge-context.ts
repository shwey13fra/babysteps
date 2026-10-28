// scripts/eval/probe-judge-context.ts
//
// What does the JUDGE see, versus what the model saw?
//
// run.ts:507 builds `byUrl` with `new Map(hits.map(h => [url, h]))`, which is
// last-wins, and run.ts:552 hands the judge `byUrl.get(url)?.content` — ONE
// chunk per cited URL. Every § stored as several chunks is therefore graded
// against an arbitrary fragment of itself.
//
// That is the suspected cause of A-16's "the excerpt stops at §10(2) and
// contains no §10(3)" and A-18's "the only supplied §24i excerpt is subsection
// (5)": both describe the judge's truncated input, not the model's context.
//
// One embedding call per question. NO model call.
//
// Run: npx tsx scripts/eval/probe-judge-context.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { retrieve } from "../../lib/rag/retrieve";

const CASES = [
  { id: "A-16", question: "How do we insure the baby after the birth?", cited: "__10.html" },
  { id: "A-18", question: "What is Mutterschaftsgeld and when do I apply for it?", cited: "__24i.html" },
];

/** run.ts's normalizeUrl, close enough for identity comparison. */
const norm = (u: string) => u.trim().replace(/\/$/, "").toLowerCase();

function markers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(?:^|\s)\((\d{1,2})\)/g)) {
    const n = Number(m[1]);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

async function main() {
  for (const c of CASES) {
    const r = await retrieve(c.question, { bundesland: "hessen" });

    const forUrl = r.hits.filter((h) => h.source_url.includes(c.cited));
    if (forUrl.length === 0) {
      console.log(`${c.id}: the cited URL was not retrieved at all — skipping\n`);
      continue;
    }

    // Exactly run.ts:507.
    const byUrl = new Map(r.hits.map((h) => [norm(h.source_url), h]));
    const judgeChunk = byUrl.get(norm(forUrl[0].source_url));

    const modelAbsaetze = [...new Set(forUrl.flatMap((h) => markers(h.content)))].sort((a, b) => a - b);
    const judgeAbsaetze = judgeChunk ? markers(judgeChunk.content).sort((a, b) => a - b) : [];
    const lost = modelAbsaetze.filter((n) => !judgeAbsaetze.includes(n));

    console.log(`======== ${c.id}`);
    console.log(`  chunks of this § the MODEL was shown : ${forUrl.map((h) => h.id).join(", ")}`);
    console.log(`  Absätze the MODEL was shown          : ${modelAbsaetze.join(", ")}`);
    console.log(`  chunk the JUDGE was handed           : ${judgeChunk?.id ?? "none"}  (byUrl last-wins)`);
    console.log(`  Absätze the JUDGE was handed         : ${judgeAbsaetze.join(", ")}`);
    console.log(`  >>> HIDDEN FROM THE JUDGE            : ${lost.length ? lost.join(", ") : "nothing"}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
