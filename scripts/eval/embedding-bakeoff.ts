// scripts/eval/embedding-bakeoff.ts
//
// Phase 2, step 1: decide the embedding model from measured numbers, not reputation.
//
// Our users type ENGLISH questions against a GERMAN statute corpus. The German->German
// scores are therefore not the decision: the English->German column is. A model that
// ranks the right § first in German and fourth in English is the wrong model for this
// product, however good its monolingual benchmarks look.
//
// Corpus: ten real sections from MuSchG, BEEG, BKGG and SGB V, fetched as official XML
// (ADR-012) and extracted verbatim to data/raw/bakeoff-corpus.json. Five are the correct
// target for one query pair each; five are topically adjacent distractors, so a high rank
// has to discriminate rather than merely match the subject area.
//
// Run: npx tsx scripts/eval/embedding-bakeoff.ts
// Reads keys from .env.local. Prints a markdown table for ADR-007. Writes nothing.

import { readFileSync } from "node:fs";

type Chunk = { id: string; role: string; title: string; text: string };

const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const corpus: Chunk[] = JSON.parse(readFileSync("data/raw/bakeoff-corpus.json", "utf8"));

// The five query pairs from the playbook, verbatim, each with the section that should win.
const QUERIES: { de: string; en: string; target: string }[] = [
  { de: "Elterngeld rückwirkend beantragen", en: "apply for parental allowance retroactively", target: "BEEG § 7" },
  { de: "Kündigungsschutz Schwangerschaft", en: "can I be fired while pregnant", target: "MuSchG § 17" },
  { de: "Hebamme Kosten Krankenkasse", en: "does insurance pay for a midwife", target: "SGB V § 24d" },
  { de: "Mutterschutzfrist Frühgeburt", en: "maternity protection premature birth", target: "MuSchG § 3" },
  { de: "Kindergeld Antrag Familienkasse", en: "how to apply for child benefit", target: "BKGG § 9" },
];

const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

// Voyage's free tier without a payment method allows 3 RPM / 10K TPM, so calls are
// paced to one every 21s and a 429 is retried rather than failing the run.
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
let lastVoyageCall = 0;

async function embedVoyage(model: string, texts: string[], kind: "query" | "document") {
  for (let attempt = 1; ; attempt++) {
    const since = Date.now() - lastVoyageCall;
    if (since < 21_000) await sleep(21_000 - since);
    lastVoyageCall = Date.now();
    let r: Response;
    try {
      r = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.VOYAGE_API_KEY}` },
        body: JSON.stringify({ input: texts, model, input_type: kind }),
      });
    } catch (e: any) {
      // Transient connection failure, not an API rejection - retry rather than lose the run.
      if (attempt <= 4) { console.log(`  (network error on ${model}: ${e?.cause?.code ?? e?.message}, retrying in 10s)`); await sleep(10_000); continue; }
      throw e;
    }
    if (r.ok) {
      const j = await r.json();
      return j.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding as number[]);
    }
    if (r.status === 429 && attempt <= 4) { console.log(`  (429 on ${model}, backing off 30s - free-tier 3 RPM)`); await sleep(30_000); continue; }
    throw new Error(`voyage ${model} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
}

async function embedOpenAI(model: string, texts: string[]) {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    // 1024 dims for parity with Voyage and with vector(1024) in migration 0002.
    body: JSON.stringify({ input: texts, model, dimensions: 1024 }),
  });
  if (!r.ok) throw new Error(`openai ${model} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding as number[]);
}

type Result = { rank: number; cos: number; topId: string };

function rankTargets(queryVecs: number[][], docVecs: number[][]): Result[] {
  return QUERIES.map((q, qi) => {
    const scored = corpus
      .map((c, ci) => ({ id: c.id, cos: cosine(queryVecs[qi], docVecs[ci]) }))
      .sort((a, b) => b.cos - a.cos);
    const rank = scored.findIndex((s) => s.id === q.target) + 1;
    return { rank, cos: scored[rank - 1].cos, topId: scored[0].id };
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const mrr = (rs: number[]) => mean(rs.map((r) => 1 / r));

async function run(label: string, embed: (texts: string[], kind: "query" | "document") => Promise<number[][]>) {
  const docVecs = await embed(corpus.map((c) => c.text), "document");
  const dim = docVecs[0].length;
  const norm = Math.sqrt(docVecs[0].reduce((a, v) => a + v * v, 0));

  const de = rankTargets(await embed(QUERIES.map((q) => q.de), "query"), docVecs);
  const en = rankTargets(await embed(QUERIES.map((q) => q.en), "query"), docVecs);

  console.log(`\n### ${label}  (dim=${dim}, |v|=${norm.toFixed(4)}${Math.abs(norm - 1) < 0.01 ? " normalised" : " NOT normalised"})\n`);
  console.log("| Query | Target | DE rank | DE cos | EN rank | EN cos | EN top-1 hit |");
  console.log("|---|---|---|---|---|---|---|");
  QUERIES.forEach((q, i) => {
    console.log(`| ${q.en} | ${q.target} | ${de[i].rank} | ${de[i].cos.toFixed(3)} | ${en[i].rank} | ${en[i].cos.toFixed(3)} | ${en[i].rank === 1 ? "yes" : `no (${en[i].topId})`} |`);
  });
  const deR = de.map((r) => r.rank), enR = en.map((r) => r.rank);
  console.log(`\n**DE** mean rank ${mean(deR).toFixed(2)} · MRR ${mrr(deR).toFixed(3)} · top-1 ${deR.filter((r) => r === 1).length}/5`);
  console.log(`**EN** mean rank ${mean(enR).toFixed(2)} · MRR ${mrr(enR).toFixed(3)} · top-1 ${enR.filter((r) => r === 1).length}/5   <-- the deciding row`);
  return { label, dim, enMRR: mrr(enR), enTop1: enR.filter((r) => r === 1).length, deMRR: mrr(deR) };
}

async function main() {
  const summary: any[] = [];
  for (const model of ["voyage-3", "voyage-4"]) {
    if (!env.VOYAGE_API_KEY) { console.log(`\n(skipped ${model} — VOYAGE_API_KEY empty)`); continue; }
    summary.push(await run(model, (t, k) => embedVoyage(model, t, k)));
  }
  if (env.OPENAI_API_KEY) {
    summary.push(await run("text-embedding-3-small (dims=1024)", (t) => embedOpenAI("text-embedding-3-small", t)));
  } else {
    console.log("\n(skipped text-embedding-3-small — OPENAI_API_KEY empty; re-run once it is set)");
  }

  console.log("\n## Summary — ranked by English->German MRR\n");
  console.log("| Model | dim | EN MRR | EN top-1 | DE MRR |");
  console.log("|---|---|---|---|---|");
  for (const s of [...summary].sort((a, b) => b.enMRR - a.enMRR)) {
    console.log(`| ${s.label} | ${s.dim} | ${s.enMRR.toFixed(3)} | ${s.enTop1}/5 | ${s.deMRR.toFixed(3)} |`);
  }
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
