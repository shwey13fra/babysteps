// scripts/eval/verify-golden.ts
//
// The Phase 2 golden-set pass. For every verify_priority: high row, check its
// ground_truth_source against what is actually ingested, and check that the question
// retrieves it. Writes a drift report; changes nothing.
//
// The playbook's warning is the reason this exists: "the eval is only as honest as its
// annotations". A golden set whose ground truth was never checked against the corpus
// measures the annotator's memory, not the system.
//
// Three outcomes per row:
//   OK        the cited source is in the corpus AND the question retrieves it in top-k
//   RETRIEVAL the source is in the corpus but the question does not surface it
//   MISSING   the cited source is not in the corpus at all
// Rows asserting an amount, threshold or entitlement are additionally flagged NEEDS-HUMAN:
// CLAUDE.md rule 13 forbids this tool from adjudicating those.
//
// Run: npx tsx scripts/eval/verify-golden.ts [--k 8]

import { readFileSync, writeFileSync } from "node:fs";
import { expandQuery } from "../../lib/rag/expand";

const CSV = "data/golden/golden_set_v1.2.csv";
const REPORT = "eval/reports/golden-verification-2026-10-23.md";

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

/** Minimal RFC4180 reader: the file has quoted fields containing commas. */
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

/** "BEEG §7(1)" -> "BEEG §7";  "MuSchG §19 SGB V §24i" -> both;  guidance -> []. */
function statuteRefs(source: string): string[] {
  const out: string[] = [];
  const re = /\b(MuSchG|BEEG|BKGG|SGB V|BGB|StAG|AufenthG|PStG|EStG)\s*§\s*(\d+[a-z]?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(`${m[1]} §${m[2]}`);
  return [...new Set(out)];
}

/**
 * Non-statute sources cannot be matched by section_ref, so they are checked by the domain
 * the answer must come from. null means the source is not in the corpus and cannot be —
 * the two consular rows, which ADR-014/016/019 leave hand-curated.
 */
const GUIDANCE_DOMAIN: Array<[RegExp, string | null]> = [
  [/G-?BA|Kinder-Richtlinie/i, "g-ba.de"],
  [/Hessen Elterngeld/i, "rp-giessen.hessen.de"],
  [/Berlin Elterngeldstelle/i, "service.berlin.de"],
  [/ElterngeldDigital/i, "elterngeld-digital"],
  [/Citizenship Act|Indian mission/i, null],
];

/** Rows whose required elements assert a sum, rate, threshold or period. */
const NUMERIC = /\b\d+([.,]\d+)?\s*(€|EUR|euro|percent|%|hours?|Stunden|months?|Monate|weeks?|Wochen|years?|Jahre)\b|\bamount\b|\bthreshold\b|\bincome limit\b/i;

async function main() {
  const k = Number(process.argv.includes("--k") ? process.argv[process.argv.indexOf("--k") + 1] : 8);
  const e = env();
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: svc, EMBEDDING_API_KEY: key } = e;
  if (!url || !svc || !key) throw new Error("missing env");

  const rows = readCsv(readFileSync(CSV, "utf8")).filter((r) => r.verify_priority === "high");
  const answers = rows.filter((r) => r.category === "ANSWER");

  // What statute refs does the corpus actually hold?
  const presentRes = await fetch(`${url}/rest/v1/corpus_chunks?select=section_ref&section_ref=not.is.null&limit=2000`, {
    headers: { apikey: svc, Authorization: `Bearer ${svc}` },
  });
  const present = new Set<string>((await presentRes.json()).map((r: any) => r.section_ref));

  const results: any[] = [];

  for (const r of answers) {
    const refs = statuteRefs(r.ground_truth_source);
    const missing = refs.filter((x) => !present.has(x));

    // Retrieval check
    const er = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: r.question, model: "text-embedding-3-small", dimensions: 1024 }),
    });
    const vec = JSON.stringify((await er.json()).data[0].embedding);
    const juris = r.jurisdiction ? [r.jurisdiction, "federal"] : ["federal"];
    const mr = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
      method: "POST",
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query_embedding: vec,
        query_text: expandQuery(r.question).lexicalQuery,
        filter_jurisdictions: [...new Set(juris)],
        match_count: k,
      }),
    });
    const hits = (await mr.json()) as any[];
    const hitRefs = hits.map((h) => h.section_ref).filter(Boolean);
    const retrieved = refs.length ? refs.filter((x) => hitRefs.includes(x)) : [];
    const guidanceOnly = refs.length === 0;

    let verdict: string;
    if (guidanceOnly) {
      const rule = GUIDANCE_DOMAIN.find(([re]) => re.test(r.ground_truth_source));
      const domain = rule?.[1];
      if (domain === null) verdict = "NOT-INGESTABLE";
      else if (!domain) verdict = "GUIDANCE";
      else verdict = hits.some((h) => (h.source_url ?? "").includes(domain)) ? "OK-GUIDANCE" : "RETRIEVAL";
    } else if (missing.length) verdict = "MISSING";
    else if (retrieved.length) verdict = "OK";
    else verdict = "RETRIEVAL";

    const needsHuman = NUMERIC.test(r.required_answer_elements);
    results.push({
      id: r.id, jurisdiction: r.jurisdiction, source: r.ground_truth_source,
      refs, missing, retrieved, verdict, needsHuman,
      topRefs: hitRefs.slice(0, 4),
      maxCos: hits.length ? Math.max(...hits.map((h) => Number(h.cosine))) : 0,
      question: r.question, elements: r.required_answer_elements,
    });
    console.log(`${verdict.padEnd(10)}${needsHuman ? "+HUMAN " : "       "}${r.id.padEnd(6)} ${r.ground_truth_source.slice(0, 40).padEnd(41)} ${verdict === "OK" ? "retrieved " + retrieved.join(", ") : verdict === "MISSING" ? "not in corpus: " + missing.join(", ") : verdict === "OK-GUIDANCE" ? "guidance domain retrieved" : verdict === "NOT-INGESTABLE" ? "consular - not in corpus, cannot be (ADR-019)" : "top: " + (hitRefs.slice(0, 3).join(", ") || hits.slice(0,2).map((h)=>new URL(h.source_url).hostname).join(", "))}`);
  }

  const by = (v: string) => results.filter((r) => r.verdict === v);
  const lines = [
    "# Golden set v1 — verification pass",
    "",
    `Date: 2026-10-22 · corpus_version 2026-10 · 673 chunks · top-k ${k}`,
    "",
    `Scope: the ${rows.length} \`verify_priority: high\` rows. The ${rows.length - answers.length} DEFLECT/REFUSE rows`,
    "carry no `ground_truth_source` — they assert behaviour, not a citation, so there is nothing",
    `to check against the corpus. That leaves ${answers.length} ANSWER rows.`,
    "",
    "| verdict | n | meaning |",
    "| --- | --- | --- |",
    `| OK | ${by("OK").length} | cited § is in the corpus and the question retrieves it |`,
    `| RETRIEVAL | ${by("RETRIEVAL").length} | § is in the corpus but the question does not surface it in top-${k} |`,
    `| MISSING | ${by("MISSING").length} | cited § is not in the corpus at all |`,
    `| OK-GUIDANCE | ${by("OK-GUIDANCE").length} | non-statute source; the expected domain is retrieved |`,
    `| NOT-INGESTABLE | ${by("NOT-INGESTABLE").length} | consular source; substance unreachable, hand-curated (ADR-019) |`,
    "",
    "## Rows",
    "",
    "| id | juris | ground_truth_source | verdict | detail |",
    "| --- | --- | --- | --- | --- |",
    ...results.map((r) => `| ${r.id} | ${r.jurisdiction} | ${r.source} | ${r.verdict}${r.needsHuman ? " +HUMAN" : ""} | ${r.verdict === "MISSING" ? "not ingested: " + r.missing.join(", ") : r.verdict === "RETRIEVAL" ? "top: " + r.topRefs.join(", ") : r.verdict === "OK" ? "retrieved " + r.retrieved.join(", ") : "non-statute"} |`),
    "",
    "## Needs a human (CLAUDE.md rule 13)",
    "",
    "These assert an amount, threshold or period. This tool must not adjudicate entitlement.",
    "",
    ...results.filter((r) => r.needsHuman).map((r) => `- **${r.id}** (${r.source}) — ${r.elements.slice(0, 160)}`),
    "",
  ];
  writeFileSync(REPORT, lines.join("\n"));
  console.log(`\nOK ${by("OK").length} · RETRIEVAL ${by("RETRIEVAL").length} · MISSING ${by("MISSING").length} · GUIDANCE ${by("GUIDANCE").length}`);
  console.log(`needs a human: ${results.filter((r) => r.needsHuman).length}`);
  console.log(`report: ${REPORT}`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
