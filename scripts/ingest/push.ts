// scripts/ingest/push.ts
//
// Inserts data/cache/embedded.json into corpus_chunks via PostgREST with the service-role
// key. Local only - scripts/ never runs in production (CLAUDE.md repo map).
//
// Plain fetch rather than @supabase/supabase-js: this is a one-shot local insert and needs
// no client. The app's clients land in lib/supabase/ in Phase 3.
//
// retrieved_at comes from data/raw/.fetch-cache.json, the moment each source was actually
// downloaded - not from now(). The product renders an as-of date next to every claim, and
// "when we inserted it" is not an honest answer to "how current is this text".
//
// Idempotency: re-running refuses if rows already exist for this corpus_version. Pass
// --replace to delete that corpus_version first. There is no natural unique key in the
// brief's schema, so upsert is not available and a silent re-run would double the corpus.
//
// Run: npx tsx scripts/ingest/push.ts [--replace]

import { readFileSync, existsSync } from "node:fs";
import type { Embedded } from "./embed";

const IN = "data/cache/embedded.json";
const FETCH_CACHE = "data/raw/.fetch-cache.json";
const BATCH = 50;

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

async function main() {
  const replace = process.argv.includes("--replace");
  const e = env();
  const url = e.NEXT_PUBLIC_SUPABASE_URL;
  const key = e.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local");

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const rows: Embedded[] = JSON.parse(readFileSync(IN, "utf8"));
  const corpusVersion = rows[0].corpus_version;

  const fetchedAt: Record<string, { fetchedAt: string }> = existsSync(FETCH_CACHE)
    ? JSON.parse(readFileSync(FETCH_CACHE, "utf8"))
    : {};

  // --- guard: is this corpus_version already in the table? ---
  const existing = await fetch(
    `${url}/rest/v1/corpus_chunks?select=id&corpus_version=eq.${encodeURIComponent(corpusVersion)}&limit=1`,
    { headers: { ...headers, Prefer: "count=exact" } },
  );
  const countHeader = existing.headers.get("content-range") ?? "";
  const already = Number(countHeader.split("/")[1] ?? 0);

  if (already > 0 && !replace) {
    console.error(`REFUSING: ${already} rows already exist for corpus_version "${corpusVersion}".`);
    console.error("Re-running would duplicate the corpus - the schema has no unique key to upsert on.");
    console.error("Pass --replace to delete that corpus_version first.");
    process.exit(1);
  }
  if (already > 0 && replace) {
    console.log(`--replace: deleting ${already} existing rows for corpus_version "${corpusVersion}"...`);
    const del = await fetch(`${url}/rest/v1/corpus_chunks?corpus_version=eq.${encodeURIComponent(corpusVersion)}`, {
      method: "DELETE",
      headers,
    });
    if (!del.ok) throw new Error(`delete failed HTTP ${del.status}: ${(await del.text()).slice(0, 200)}`);
    console.log("  deleted.\n");
  }

  const payload = rows.map((r) => ({
    content: r.content,
    embedding: JSON.stringify(r.embedding),
    source_url: r.source_url,
    doc_title: r.doc_title,
    section_ref: r.section_ref,
    jurisdiction: r.jurisdiction,
    track: r.track,
    valid_from: r.valid_from,
    retrieved_at: fetchedAt[r.source_id]?.fetchedAt ?? new Date().toISOString(),
    corpus_version: r.corpus_version,
  }));

  let inserted = 0;
  for (let i = 0; i < payload.length; i += BATCH) {
    const slice = payload.slice(i, i + BATCH);
    const res = await fetch(`${url}/rest/v1/corpus_chunks`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(slice),
    });
    if (!res.ok) throw new Error(`insert failed at row ${i} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    inserted += slice.length;
    console.log(`  inserted ${inserted}/${payload.length}`);
  }

  // --- the Phase 2 gate wants per-jurisdiction counts and no null section_ref ---
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.jurisdiction, (counts.get(r.jurisdiction) ?? 0) + 1);

  const nullRef = await fetch(
    `${url}/rest/v1/corpus_chunks?select=id&section_ref=is.null&limit=1`,
    { headers: { ...headers, Prefer: "count=exact" } },
  );
  const nullRefCount = Number((nullRef.headers.get("content-range") ?? "").split("/")[1] ?? 0);

  const total = await fetch(`${url}/rest/v1/corpus_chunks?select=id&limit=1`, {
    headers: { ...headers, Prefer: "count=exact" },
  });
  const totalCount = Number((total.headers.get("content-range") ?? "").split("/")[1] ?? 0);

  console.log(`\ncorpus_version: ${corpusVersion}`);
  console.log("chunks per jurisdiction:");
  for (const [j, n] of counts) console.log(`  ${j.padEnd(16)} ${n}`);
  console.log(`\ntotal rows in corpus_chunks : ${totalCount}`);
  console.log(`rows with null section_ref  : ${nullRefCount}  <-- must be 0 for statute text`);
  console.log(`Phase 2 gate wants > 500 total; statute sources alone give ${totalCount}.`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
