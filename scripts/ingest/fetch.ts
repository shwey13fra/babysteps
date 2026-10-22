// scripts/ingest/fetch.ts
//
// Downloads the manifest sources marked `fetch: auto` into data/raw/ (gitignored).
//
// PERMISSION IS CHECKED LIVE, per URL, by scripts/ingest/robots.ts, using the same
// User-Agent and redirect handling as the content request. The manifest's robots field is
// a dated observation for the audit trail (ADR-013), NOT the thing that authorises a
// download - a verdict copied into YAML is a fact that rots and that nothing re-checks,
// which is how ADR-012 and then ADR-014 both recorded a prohibition against the wrong
// site. This fetcher warns when the live answer disagrees with the recorded one.
//
// `fetch: manual` sources are never downloaded whatever robots says (ADR-014/016):
// cgi_frankfurt serves "Disallow: /", frankfurt.de's bot protection 403s this client even
// though its robots permits crawling, and indianembassyberlin.gov.in's host returns 404.
// We do not spoof a browser fingerprint to get around an access control.
//
// Caching: stored ETag / Last-Modified are replayed as conditional requests.
// This downloads only. Unzipping and parsing belong to parse.ts.
//
// Run: npx tsx scripts/ingest/fetch.ts [--force]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { checkUrl } from "./robots";

const MANIFEST = "data/corpus_manifest.yaml";
const RAW_DIR = "data/raw";
const CACHE_FILE = join(RAW_DIR, ".fetch-cache.json");
const USER_AGENT = "BabyStepsBot/0.1 (+https://github.com/shwey13fra/babysteps)";
const POLITE_DELAY_MS = 1_000;

type Source = {
  id: string;
  format: "xml" | "html" | "pdf";
  url?: string;
  urls?: string[];
  fetch: "auto" | "manual" | "pending_urls" | "proposed";
  robots?: { allows: boolean | "unknown"; rule?: string; checked?: string };
  blocked_by?: string;
};
type Manifest = { version: number; corpus_version: string; sources: Source[] };
type CacheEntry = { etag?: string; lastModified?: string; bytes: number; fetchedAt: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stable, filesystem-safe name for one page of a multi-URL source. */
function pageName(url: string): string {
  const u = new URL(url);
  const slug = (u.pathname + u.search).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "index";
  return slug.slice(-80);
}

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

  const results: { key: string; status: string; bytes: number | string }[] = [];
  let downloaded = 0, notModified = 0, skipped = 0, refused = 0;
  const drift: string[] = [];

  for (const src of manifest.sources) {
    if (src.fetch !== "auto") {
      skipped++;
      results.push({ key: src.id, status: `SKIPPED — fetch: ${src.fetch}${src.blocked_by ? ` (${src.blocked_by})` : ""}`, bytes: "-" });
      continue;
    }

    const urls = src.urls?.length ? src.urls : src.url ? [src.url] : [];
    if (!urls.length) {
      skipped++;
      results.push({ key: src.id, status: "SKIPPED — no url", bytes: "-" });
      continue;
    }

    const multi = urls.length > 1 || src.format !== "xml";
    if (multi) mkdirSync(join(RAW_DIR, src.id), { recursive: true });

    for (const url of urls) {
      const key = urls.length > 1 ? `${src.id}/${pageName(url)}` : src.id;

      // --- live permission check, same UA as the content request ---
      const verdict = await checkUrl(url, USER_AGENT);
      if (src.robots && src.robots.allows !== verdict.allowed) {
        drift.push(`${src.id}: manifest says allows=${src.robots.allows}, live says ${verdict.allowed} (${verdict.why})`);
      }
      if (!verdict.allowed) {
        refused++;
        results.push({ key, status: `REFUSED by robots — ${verdict.why}`, bytes: "-" });
        continue;
      }

      const dest = multi
        ? join(RAW_DIR, src.id, `${pageName(url)}.${src.format === "xml" ? "xml.zip" : src.format}`)
        : join(RAW_DIR, `${src.id}.${src.format === "xml" ? "xml.zip" : src.format}`);

      const prior = cache[key];
      const headers: Record<string, string> = { "User-Agent": USER_AGENT };
      if (!force && prior && existsSync(dest)) {
        if (prior.etag) headers["If-None-Match"] = prior.etag;
        if (prior.lastModified) headers["If-Modified-Since"] = prior.lastModified;
      }

      let res: Response;
      try {
        res = await fetch(url, { headers, redirect: "follow" });
      } catch (e: any) {
        results.push({ key, status: `ERROR — ${e?.message ?? e}`, bytes: "-" });
        continue;
      }

      if (res.status === 304) {
        notModified++;
        results.push({ key, status: "304 not modified", bytes: prior?.bytes ?? "-" });
      } else if (!res.ok) {
        results.push({ key, status: `HTTP ${res.status}`, bytes: "-" });
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(dest, buf);
        cache[key] = {
          etag: res.headers.get("etag") ?? undefined,
          lastModified: res.headers.get("last-modified") ?? undefined,
          bytes: buf.length,
          fetchedAt: new Date().toISOString(),
        };
        downloaded++;
        results.push({ key, status: `200 → ${dest}`, bytes: buf.length });
      }
      await sleep(POLITE_DELAY_MS);
    }
  }

  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  console.log(`\ncorpus_version: ${manifest.corpus_version}   sources: ${manifest.sources.length}\n`);
  console.log("key                                        bytes      status");
  console.log("-".repeat(100));
  for (const r of results) console.log(`${r.key.slice(0, 41).padEnd(42)} ${String(r.bytes).padStart(9)}  ${r.status}`);

  console.log(`\ndownloaded ${downloaded} · not modified ${notModified} · skipped ${skipped} · refused by robots ${refused}`);
  if (drift.length) {
    console.log("\nROBOTS DRIFT — the manifest disagrees with the live robots.txt:");
    for (const d of drift) console.log(`  ${d}`);
    console.log("  Update the manifest's robots field and its checked date.");
  } else {
    console.log("No robots drift: every live verdict matched the manifest.");
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
