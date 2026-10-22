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
import * as cheerio from "cheerio";
import pdfParse from "pdf-parse";

const MANIFEST = "data/corpus_manifest.yaml";
const RAW_DIR = "data/raw";
const CACHE_DIR = "data/cache";
const OUT = join(CACHE_DIR, "parsed.json");

type Source = {
  id: string;
  format: string;
  url?: string;
  urls?: string[];
  domain?: string;
  content_selector?: string;
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
  /** null for explanatory HTML pages: they are not statute and have no §. */
  section_ref: string | null;
  number: string | null;
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

/**
 * The Kinder-Richtlinie is a PDF, but it is §-structured authoritative text, not prose
 * guidance: §3 is U1, §4 is U2, and so on. So its chunks carry a section_ref
 * ("Kinder-RL §4") and are ranked in the statute pool (ADR-017) — an answer about U2
 * timing must cite the Richtlinie, not somebody's summary of it.
 *
 * The landing page at /richtlinien/15/ carries no timings at all; this file is where
 * "U2 3.-10. Lebenstag, Toleranzgrenze 3.-14. Lebenstag" actually lives.
 */
async function parsePdfSource(src: Source, corpusVersion: string): Promise<Section[]> {
  const out: Section[] = [];
  for (const url of src.urls ?? []) {
    const file = join(RAW_DIR, src.id, `${pageName(url)}.pdf`);
    if (!existsSync(file)) {
      console.log(`  ${src.id}: missing ${file} — run fetch.ts`);
      continue;
    }
    const parsed = await pdfParse(readFileSync(file));

    const text = parsed.text
      // Table-of-contents lines are "§ 4 U2 ..................... 10" — drop them, or the
      // TOC entry for every § would be mistaken for that §'s body.
      .split(/\r?\n/)
      .filter((l: string) => !/\.{5,}\s*\d+\s*$/.test(l))
      .join("\n")
      // The PDF's justified text leaves runs of spaces inside sentences.
      .replace(/[ \t ]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n");

    const headings = [...text.matchAll(/^\s*§\s*(\d+[a-z]?)\s+(.{0,80}?)\s*$/gm)];
    if (!headings.length) {
      console.log(`  ${src.id}: no § headings found in ${pageName(url)}`);
      continue;
    }

    for (let i = 0; i < headings.length; i++) {
      const m = headings[i];
      const start = (m.index ?? 0) + m[0].length;
      const end = i + 1 < headings.length ? headings[i + 1].index : text.length;
      const body = text.slice(start, end).trim();
      if (body.length < 80) continue;

      // Skip the documentation annex. §69 "Dokumentation" is the blank examination-booklet
      // forms: 138,795 of the Richtlinie's 260,811 characters — 53% — made of field labels
      // and "______" placeholders. It is not normative text, and because it repeats every
      // U-number it swamped retrieval: "U2 Untersuchung" returned four §69 chunks before
      // §2, which carries the actual Zeitraum/Toleranzgrenze table. Underscore density
      // separates a form from prose cleanly here (§69 4.1%, every other section 0.0%).
      const underscoreRatio = (body.match(/_/g)?.length ?? 0) / body.length;
      if (underscoreRatio > 0.02) {
        console.log(`  ${src.id}: skipping §${m[1]} "${m[2].trim().slice(0, 30)}" — ${(underscoreRatio * 100).toFixed(1)}% underscores, a blank form`);
        continue;
      }
      out.push({
        source_id: src.id,
        section_ref: `Kinder-RL §${m[1]}`,
        number: m[1],
        heading: m[2].trim(),
        text: body,
        doc_title: src.title_de ?? src.id,
        source_url: url,
        jurisdiction: src.jurisdiction ?? "federal",
        track: src.track ?? "german",
        corpus_version: corpusVersion,
        valid_from: null,
      });
    }
  }
  return out;
}

/** Same slug rule as fetch.ts, so a manifest URL maps to the file it was saved as. */
function pageName(url: string): string {
  const u = new URL(url);
  const slug = (u.pathname + u.search).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "index";
  return slug.slice(-80);
}

// Site furniture that is not content. Removed before the content selector is applied so a
// cookie banner or share bar inside <main> cannot end up embedded and cited as a source.
const CHROME = [
  "script", "style", "noscript", "nav", "header", "footer", "aside", "form",
  "[role=navigation]", "[class*=cookie]", "[id*=cookie]", "[class*=breadcrumb]",
  "[class*=share]", "[class*=social]", "[class*=skip]", "[class*=languageswitch]",
  "[class*=sprachwahl]", "[class*=metanav]", "[class*=teaser-list]",
].join(",");

function parseHtmlSource(src: Source, corpusVersion: string): Section[] {
  const out: Section[] = [];
  const selector = src.content_selector ?? "main";

  for (const url of src.urls ?? []) {
    const file = join(RAW_DIR, src.id, `${pageName(url)}.html`);
    if (!existsSync(file)) {
      console.log(`  ${src.id}: missing ${file} — run fetch.ts`);
      continue;
    }
    const $ = cheerio.load(readFileSync(file, "utf8"));
    const pageTitle = $("title").first().text().replace(/\s+/g, " ").trim().split("|")[0].trim();
    $(CHROME).remove();
    const root = $(selector).first();
    if (!root.length) {
      console.log(`  ${src.id}: selector "${selector}" matched nothing in ${pageName(url)}`);
      continue;
    }

    // Walk the content in document order, starting a new section at each h2/h3.
    let heading = pageTitle;
    let buf: string[] = [];
    const flush = () => {
      const text = buf.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      buf = [];
      if (text.length < 80) return; // nav remnants and one-line stubs are not content
      out.push({
        source_id: src.id,
        section_ref: null,
        number: null,
        heading,
        text,
        doc_title: pageTitle || src.id,
        source_url: url,
        jurisdiction: src.jurisdiction ?? "federal",
        track: src.track ?? "german",
        corpus_version: corpusVersion,
        valid_from: null,
      });
    };

    root.find("h2, h3, p, li, dd, dt, td").each((_i, el) => {
      const tag = (el as any).tagName?.toLowerCase();
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (!t) return;
      if (tag === "h2" || tag === "h3") {
        flush();
        heading = t;
      } else {
        buf.push(t);
      }
    });
    flush();
  }
  return out;
}

/**
 * A section with NO sentence-ending punctuation and short lines is a list of link labels
 * — site furniture that survived the chrome selectors — not prose. Deliberately the most
 * conservative of the rules measured: a looser one (sentences < 2, or length < 400) also
 * dropped real content such as "Einnahmen, die kein Erwerbseinkommen sind", which is one
 * explanatory sentence followed by examples. Dropping a genuine source is worse than
 * embedding a little navigation.
 */
function isLinkList(text: string): boolean {
  const lines = text.split(/\n{2,}/).filter(Boolean);
  const sentences = (text.match(/[.!?](\s|$)/g) ?? []).length;
  return sentences === 0 && text.length / Math.max(1, lines.length) < 70;
}

/**
 * Postgres `text` cannot hold a NUL byte: an insert carrying one fails with 22P05
 * "unsupported Unicode escape sequence". PDF extraction produces them (the Kinder-
 * Richtlinie did, and the push aborted at row 750 of 833). Strip every C0 control
 * except tab and newline, from every source — the cost is nil and the failure mode is
 * a half-written corpus.
 */
function stripControls(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/** Exact-duplicate text across pages is boilerplate (one block recurs on 31 pages). */
function dedupe(sections: Section[]): { kept: Section[]; dropped: { dup: number; listy: number } } {
  const seen = new Set<string>();
  const kept: Section[] = [];
  let dup = 0;
  let listy = 0;
  for (const s of sections) {
    s.text = stripControls(s.text);
    s.heading = stripControls(s.heading);
    if (s.section_ref === null && isLinkList(s.text)) {
      listy++;
      continue;
    }
    if (seen.has(s.text)) {
      dup++;
      continue;
    }
    seen.add(s.text);
    kept.push(s);
  }
  return { kept, dropped: { dup, listy } };
}

async function main() {
  const manifest = parseYaml(readFileSync(MANIFEST, "utf8")) as { corpus_version: string; sources: Source[] };
  mkdirSync(CACHE_DIR, { recursive: true });

  const all: Section[] = [];
  console.log(`corpus_version: ${manifest.corpus_version}\n`);
  console.log("source      sections  chars     refs");
  console.log("-".repeat(78));

  for (const src of manifest.sources) {
    if (src.fetch !== "auto") continue;
    if (!["xml", "html", "pdf"].includes(src.format)) continue;
    const secs = src.format === "xml"
      ? parseStatute(src, manifest.corpus_version)
      : src.format === "pdf"
        ? await parsePdfSource(src, manifest.corpus_version)
        : parseHtmlSource(src, manifest.corpus_version);
    all.push(...secs);
    const chars = secs.reduce((a, s) => a + s.text.length, 0);
    const sample = secs.slice(0, 3).map((s) => s.section_ref).join(", ");
    console.log(`${src.id.padEnd(11)} ${String(secs.length).padStart(8)} ${String(chars).padStart(9)}  ${sample}${secs.length > 3 ? " …" : ""}`);
  }

  const { kept, dropped } = dedupe(all);
  console.log(`\ndropped: ${dropped.listy} link-list sections, ${dropped.dup} exact duplicates (boilerplate recurring across pages)`);
  all.length = 0;
  all.push(...kept);

  writeFileSync(OUT, JSON.stringify(all, null, 2));
  const noHeading = all.filter((s) => !s.heading).length;
  const statutes = all.filter((s) => s.source_id !== "" && s.section_ref !== null);
  const noRef = statutes.filter((s) => /undefined/.test(String(s.section_ref))).length;
  console.log(`\ntotal sections: ${all.length}   total chars: ${all.reduce((a, s) => a + s.text.length, 0)}`);
  console.log(`statute sections: ${statutes.length} (bad section_ref: ${noRef})   html sections: ${all.length - statutes.length} (section_ref null by design)`);
  console.log(`sections with no heading: ${noHeading}`);
  console.log(`written: ${OUT}`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
