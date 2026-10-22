// scripts/ingest/query.ts
//
// Inspection command for the ingested corpus. Prints the top-5 with the per-retriever
// signals, so a retrieval miss can be attributed to the vector half or the lexical half
// rather than guessed at - which is the whole reason 0002 returns them separately.
//
// Embeds the ORIGINAL question and passes the GERMAN-EXPANDED string as query_text, exactly
// as 0002_match_chunks_rrf.sql's header specifies. lib/rag/expand.ts already exists and is
// deterministic, so this uses it rather than reimplementing the bridge.
//
// Read-only. Uses the service-role key because anon cannot reach corpus_chunks by design.
//
// Run: npx tsx scripts/ingest/query.ts "<query>" [--jurisdictions federal,hesse] [--k 5] [--raw]

import { readFileSync } from "node:fs";
import { expandQuery } from "../../lib/rag/expand";

const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1024;

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const question = process.argv.slice(2).filter((a) => !a.startsWith("--"))[0];
  if (!question) {
    console.error('usage: npx tsx scripts/ingest/query.ts "<query>" [--jurisdictions federal,hesse] [--k 5] [--raw]');
    process.exit(1);
  }
  const k = Number(arg("--k", "5"));
  const jurisdictions = arg("--jurisdictions", "federal,hesse,berlin,consular-india").split(",");
  const e = env();
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: svc, EMBEDDING_API_KEY: key } = e;
  if (!url || !svc || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or EMBEDDING_API_KEY missing");

  const expansion = expandQuery(question);

  const er = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: expansion.original, model: MODEL, dimensions: DIMENSIONS }),
  });
  if (!er.ok) throw new Error(`embeddings HTTP ${er.status}: ${(await er.text()).slice(0, 200)}`);
  const embedding = (await er.json()).data[0].embedding as number[];

  const rr = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
    method: "POST",
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query_embedding: JSON.stringify(embedding),
      query_text: expansion.lexicalQuery,
      filter_jurisdictions: jurisdictions,
      match_count: k,
    }),
  });
  if (!rr.ok) throw new Error(`match_chunks HTTP ${rr.status}: ${(await rr.text()).slice(0, 300)}`);
  const hits: any[] = await rr.json();

  // match_chunks does not return jurisdiction, so look it up for the rows we got.
  const jmap = new Map<number, string>();
  if (hits.length) {
    const ids = hits.map((h) => h.id).join(",");
    const jr = await fetch(`${url}/rest/v1/corpus_chunks?select=id,jurisdiction&id=in.(${ids})`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    });
    if (jr.ok) for (const row of await jr.json()) jmap.set(row.id, row.jurisdiction);
  }

  console.log(`\nquery      : ${question}`);
  console.log(`lexical    : ${expansion.lexicalQuery}`);
  console.log(`glossary   : ${expansion.matched.map((m) => `${m.de} (${m.en_gloss})`).join(", ") || "(nothing fired)"}`);
  console.log(`filter     : ${jurisdictions.join(", ")}\n`);

  if (!hits.length) {
    console.log("no rows returned.");
    return;
  }

  console.log("#  section_ref       jurisdiction  cosine  vec_pos  fts_pos    rrf   as of");
  console.log("-".repeat(88));
  hits.forEach((h, i) => {
    const asOf = (h.retrieved_at ?? "").slice(0, 10);
    console.log(
      `${String(i + 1).padEnd(2)} ${String(h.section_ref).padEnd(17)} ${String(jmap.get(h.id) ?? "?").padEnd(13)} ` +
      `${Number(h.cosine).toFixed(3)}  ${String(h.vec_pos ?? "-").padStart(7)}  ${String(h.fts_pos ?? "-").padStart(7)}  ` +
      `${Number(h.rrf).toFixed(4)}  ${asOf}`,
    );
  });

  console.log(`\nrefusal signal: max cosine = ${Math.max(...hits.map((h) => Number(h.cosine))).toFixed(3)}`);
  console.log("(threshold on cosine, never on rrf - ADR-008)");

  if (process.argv.includes("--raw")) {
    console.log("\n--- top hit, full text ---");
    console.log(hits[0].content);
    console.log(`\n${hits[0].source_url}`);
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
