// scripts/ingest/embed.ts
//
// Embeds data/cache/chunks.json with text-embedding-3-small at dimensions: 1024 and
// writes data/cache/embedded.json. Reads EMBEDDING_API_KEY from .env.local.
//
// dimensions: 1024 is not optional. The default is 1536 and corpus_chunks.embedding is
// vector(1024), so omitting it fails at insert time - ADR-007's Consequence paragraph.
//
// Model choice is ADR-007: text-embedding-3-small swept both columns of the bake-off
// (EN->DE MRR 1.000, DE 1.000) against voyage-3 and voyage-4. Do not change the model here
// without re-embedding the whole corpus; a corpus with two embedding models in it is
// silently broken, because cosine distance between them is meaningless.
//
// Caches by content hash, so a re-run after editing one rule re-embeds only what changed.
//
// Run: npx tsx scripts/ingest/embed.ts [--force]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Chunk } from "./chunk";

const IN = "data/cache/chunks.json";
const OUT = "data/cache/embedded.json";
const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1024;
const BATCH = 64;
const USD_PER_MILLION_TOKENS = 0.02;

export type Embedded = Chunk & { embedding: number[]; content_hash: string };

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

async function embedBatch(texts: string[], key: string): Promise<number[][]> {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: texts, model: MODEL, dimensions: DIMENSIONS }),
    });
    if (r.ok) {
      const j = await r.json();
      return j.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding as number[]);
    }
    const body = (await r.text()).slice(0, 200);
    if ((r.status === 429 || r.status >= 500) && attempt <= 4) {
      const wait = 2000 * attempt;
      console.log(`  (HTTP ${r.status}, retry ${attempt}/4 in ${wait / 1000}s)`);
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    throw new Error(`embeddings HTTP ${r.status}: ${body}`);
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const key = env().EMBEDDING_API_KEY;
  if (!key) throw new Error("EMBEDDING_API_KEY is empty in .env.local");

  const chunks: Chunk[] = JSON.parse(readFileSync(IN, "utf8"));
  const prior: Embedded[] = !force && existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const cached = new Map(prior.map((e) => [e.content_hash, e.embedding]));

  const withHash = chunks.map((c) => ({ ...c, content_hash: hash(c.content) }));
  const todo = withHash.filter((c) => !cached.has(c.content_hash));

  const estTokens = todo.reduce((a, c) => a + c.est_tokens, 0);
  console.log(`chunks: ${withHash.length}   cached: ${withHash.length - todo.length}   to embed: ${todo.length}`);
  console.log(`model: ${MODEL}  dimensions: ${DIMENSIONS}`);
  console.log(`estimated cost: ~$${((estTokens / 1_000_000) * USD_PER_MILLION_TOKENS).toFixed(4)} (${estTokens} est tokens @ $${USD_PER_MILLION_TOKENS}/1M)\n`);

  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    const vecs = await embedBatch(slice.map((c) => c.content), key);
    slice.forEach((c, j) => cached.set(c.content_hash, vecs[j]));
    console.log(`  embedded ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  }

  const embedded: Embedded[] = withHash.map((c) => ({ ...c, embedding: cached.get(c.content_hash)! }));

  const badDim = embedded.filter((e) => e.embedding?.length !== DIMENSIONS);
  const missing = embedded.filter((e) => !e.embedding);
  if (missing.length) throw new Error(`${missing.length} chunks have no embedding`);
  if (badDim.length) throw new Error(`${badDim.length} embeddings are not ${DIMENSIONS}-dim — the insert would fail`);

  writeFileSync(OUT, JSON.stringify(embedded));
  const norm = Math.sqrt(embedded[0].embedding.reduce((a, v) => a + v * v, 0));
  console.log(`\nall ${embedded.length} embeddings are ${DIMENSIONS}-dim  |v|=${norm.toFixed(4)}`);
  console.log(`written: ${OUT}`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
