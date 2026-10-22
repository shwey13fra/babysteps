// scripts/ingest/fetch.ts
//
// Downloads every source in data/corpus_manifest.yaml that is permitted and marked
// `fetch: auto`, into data/raw/ (gitignored, never committed).
//
// ADR-014 is enforced here, in code, not by convention: a source is fetched only when
// its manifest entry says `robots.allows: true`. `false` and `unknown` are both refusals.
// www.frankfurt.de returns HTTP 403 on robots.txt and indianembassyberlin.gov.in redirects
// to an error page, so neither can be shown to permit crawling; cgifrankfurt.gov.in serves
// "User-agent: * / Disallow: /" outright. Editing the manifest alone cannot re-enable them.
//
// Caching: a stored ETag / Last-Modified is replayed as a conditional request, so a re-run
// costs one 304 per source rather than a re-download. gesetze-im-internet is a public
// service and this script may be run repeatedly during development.
//
// This downloads only. Unzipping and parsing belong to parse.ts.
//
// Run: npx tsx scripts/ingest/fetch.ts [--force]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const MANIFEST = "data/corpus_manifest.yaml";
const RAW_DIR = "data/raw";
const CACHE_FILE = join(RAW_DIR, ".fetch-cache.json");
const USER_AGENT = "BabyStepsBot/0.1 (+https://github.com/shwey13fra/babysteps)";
const POLITE_DELAY_MS = 1_000;

type Robots = { allows: boolean | "unknown"; rule: string; checked: string };
type Source = {
  id: string;
  format: "xml" | "html" | "pdf";
  url?: string;
  urls?: string[];
  domain?: string;
  fetch: "auto" | "manual" | "pending_urls" | "proposed";
  robots: Robots;
};
type Manifest = { version: number; corpus_version: string; sources: Source[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ADR-014. The single place that decides whether a download may happen. */
function mayFetch(s: Source): { ok: boolean; reason: string } {
  if (s.robots?.allows !== true) {
    return { ok: false, reason: `robots: ${s.robots?.allows} — ${s.robots?.rule ?? "no rule recorded"}` };
  }
  if (s.fetch !== "auto") return { ok: false, reason: `fetch: ${s.fetch}` };
  if (!s.url) return { ok: false, reason: "no url" };
  return { ok: true, reason: "" };
}

type CacheEntry = { etag?: string; lastModified?: string; bytes: number; fetchedAt: string };

function loadCache(): Record<string, CacheEntry> {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const manifest: Manifest = parse(readFileSync(MANIFEST, "utf8"));
  mkdirSync(RAW_DIR, { recursive: true });
  const cache = loadCache();

  const results: { id: string; status: string; bytes: number | string }[] = [];
  let downloaded = 0;
  let notModified = 0;
  let refused = 0;

  for (const s of manifest.sources) {
    const verdict = mayFetch(s);
    if (!verdict.ok) {
      refused++;
      results.push({ id: s.id, status: `SKIPPED — ${verdict.reason}`, bytes: "-" });
      continue;
    }

    const ext = s.format === "xml" ? "xml.zip" : s.format;
    const dest = join(RAW_DIR, `${s.id}.${ext}`);
    const prior = cache[s.id];

    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (!force && prior && existsSync(dest)) {
      if (prior.etag) headers["If-None-Match"] = prior.etag;
      if (prior.lastModified) headers["If-Modified-Since"] = prior.lastModified;
    }

    let res: Response;
    try {
      res = await fetch(s.url!, { headers });
    } catch (e: any) {
      results.push({ id: s.id, status: `ERROR — ${e?.message ?? e}`, bytes: "-" });
      continue;
    }

    if (res.status === 304) {
      notModified++;
      results.push({ id: s.id, status: "304 not modified", bytes: prior?.bytes ?? "-" });
      await sleep(POLITE_DELAY_MS);
      continue;
    }
    if (!res.ok) {
      results.push({ id: s.id, status: `HTTP ${res.status}`, bytes: "-" });
      await sleep(POLITE_DELAY_MS);
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    cache[s.id] = {
      etag: res.headers.get("etag") ?? undefined,
      lastModified: res.headers.get("last-modified") ?? undefined,
      bytes: buf.length,
      fetchedAt: new Date().toISOString(),
    };
    downloaded++;
    results.push({ id: s.id, status: `200 → ${dest}`, bytes: buf.length });
    await sleep(POLITE_DELAY_MS);
  }

  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  console.log(`\ncorpus_version: ${manifest.corpus_version}   sources in manifest: ${manifest.sources.length}\n`);
  console.log("id                      bytes      status");
  console.log("-".repeat(78));
  for (const r of results) {
    console.log(`${r.id.padEnd(23)} ${String(r.bytes).padStart(9)}  ${r.status}`);
  }
  console.log(`\ndownloaded ${downloaded} · not modified ${notModified} · skipped ${refused}`);
  console.log("Skipped sources are refused by ADR-014 or awaiting URLs; this is expected, not a failure.");
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
