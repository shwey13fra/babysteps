// scripts/ingest/parse.ts
//
// Turns the fetched gesetze-im-internet archives into section records, verbatim.
// Nothing here paraphrases, summarises or invents text (CLAUDE.md rule 14, ADR-013).
//
// The whole argument for XML over HTML (ADR-013) is this file: each statute section is a
// <norm> carrying <enbez> (the § designation) and <titel> (its heading) as structure, so
// "never orphan a § from its heading" is a property of the data, not a heuristic recovered
// from rendered markup. chunk.ts can therefore split inside a section without ever losing
// which § the text belongs to.
//
// section_ref comes from the manifest's ref_prefix, NOT from the XML: SGB V carries no
// <amtabk> at all (its <jurabk> is "SGB 5"), while data/rules/*.yaml and the golden set
// both cite "SGB V §24d". Deriving it would silently produce refs nothing else matches.
//
// Reads only the files the manifest declares, never a directory glob - data/raw/ still
// holds superseded downloads from the bake-off session that ADR-007 depends on.
//
// Run: npx tsx scripts/ingest/parse.ts

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { unzipSync, strFromU8 } from "fflate";

const MANIFEST = "data/corpus_manifest.yaml";
const RAW_DIR = "data/raw";
const CACHE_DIR = "data/cache";
const OUT = join(CACHE_DIR, "parsed.json");

type Source = {
  id: string;
  format: string;
  url?: string;
  fetch: string;
  ref_prefix?: string;
  only_sections?: string[];
  jurisdiction?: string;
  track?: string;
  title_de?: string;
  robots: { allows: boolean | "unknown" };
};

export type Section = {
  source_id: string;
  section_ref: string;
  number: string;
  heading: string;
  text: string;
  doc_title: string;
  source_url: string;
  jurisdiction: string;
  track: string;
  corpus_version: string;
  valid_from: string | null;
};

/** Statute XML uses a small presentational vocabulary. Keep the text, keep the breaks. */
function xmlToText(fragment: string): string {
  return fragment
    .replace(/<BR\s*\/?>/gi, "\n")
    .replace(/<\/P>/gi, "\n\n")
    .replace(/<DT>/gi, "\n")
    .replace(/<\/DT>/gi, " ")
    .replace(/<\/DD>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß").replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&")              // last, so &amp;lt; does not become <
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

const pick = (s: string, re: RegExp) => (s.match(re)?.[1] ?? "").trim();

function parseStatute(src: Source, corpusVersion: string): Section[] {
  const zipPath = join(RAW_DIR, `${src.id}.xml.zip`);
  if (!existsSync(zipPath)) {
    console.log(`  ${src.id}: no archive at ${zipPath} — run fetch.ts first`);
    return [];
  }
  const files = unzipSync(new Uint8Array(readFileSync(zipPath)));
  const names = Object.keys(files).filter((n) => n.toLowerCase().endsWith(".xml"));
  if (names.length !== 1) throw new Error(`${src.id}: expected one .xml in the archive, found ${names.length}`);
  const xml = strFromU8(files[names[0]]);

  // Law-level metadata lives on the first <norm>, which carries no <enbez>.
  const docTitle = pick(xml, /<langue>([\s\S]*?)<\/langue>/) || src.title_de || src.id;
  const validFrom = pick(xml, /<ausfertigung-datum[^>]*>(\d{4}-\d{2}-\d{2})<\/ausfertigung-datum>/) || null;

  // Slug for the per-section citation URL: .../muschg_2018/xml.zip -> muschg_2018.
  // This matches the URLs data/rules/*.yaml already cites, e.g. /beeg/__7.html.
  const slug = pick(src.url ?? "", /gesetze-im-internet\.de\/([^/]+)\/xml\.zip/);
  if (!slug) throw new Error(`${src.id}: cannot derive slug from url ${src.url}`);

  const want = src.only_sections ? new Set(src.only_sections) : null;
  const out: Section[] = [];

  for (const chunk of xml.split("<norm ").slice(1)) {
    const enbez = pick(chunk, /<enbez>([\s\S]*?)<\/enbez>/);
    const m = enbez.match(/^§+\s*(\d+[a-z]?)/i);
    if (!m) continue;                       // Inhaltsübersicht, Anlagen, unnumbered norms
    const number = m[1];
    if (want && !want.has(number)) continue;

    const body = pick(chunk, /<text[^>]*>([\s\S]*?)<\/text>/);
    const content = pick(body, /<Content>([\s\S]*?)<\/Content>/) || body;
    const text = xmlToText(content);
    if (!text) continue;                    // repealed sections ("(weggefallen)") carry no Content

    const heading = xmlToText(pick(chunk, /<titel[^>]*>([\s\S]*?)<\/titel>/));
    out.push({
      source_id: src.id,
      section_ref: `${src.ref_prefix} §${number}`,
      number,
      heading,
      text,
      doc_title: docTitle,
      source_url: `https://www.gesetze-im-internet.de/${slug}/__${number}.html`,
      jurisdiction: src.jurisdiction ?? "federal",
      track: src.track ?? "german",
      corpus_version: corpusVersion,
      valid_from: validFrom,
    });
  }

  if (want) {
    const got = new Set(out.map((s) => s.number));
    const missing = [...want].filter((n) => !got.has(n));
    if (missing.length) console.log(`  ${src.id}: WARNING requested sections not found: ${missing.join(", ")}`);
  }
  return out;
}

function main() {
  const manifest = parseYaml(readFileSync(MANIFEST, "utf8")) as { corpus_version: string; sources: Source[] };
  mkdirSync(CACHE_DIR, { recursive: true });

  const all: Section[] = [];
  console.log(`corpus_version: ${manifest.corpus_version}\n`);
  console.log("source      sections  chars     refs");
  console.log("-".repeat(78));

  for (const src of manifest.sources) {
    if (src.format !== "xml" || src.fetch !== "auto") continue;
    const secs = parseStatute(src, manifest.corpus_version);
    all.push(...secs);
    const chars = secs.reduce((a, s) => a + s.text.length, 0);
    const sample = secs.slice(0, 3).map((s) => s.section_ref).join(", ");
    console.log(`${src.id.padEnd(11)} ${String(secs.length).padStart(8)} ${String(chars).padStart(9)}  ${sample}${secs.length > 3 ? " …" : ""}`);
  }

  writeFileSync(OUT, JSON.stringify(all, null, 2));
  const noHeading = all.filter((s) => !s.heading).length;
  const noRef = all.filter((s) => !s.section_ref || /undefined/.test(s.section_ref)).length;
  console.log(`\ntotal sections: ${all.length}   total chars: ${all.reduce((a, s) => a + s.text.length, 0)}`);
  console.log(`sections with no heading: ${noHeading}   with a bad section_ref: ${noRef}`);
  console.log(`written: ${OUT}`);
}

main();
