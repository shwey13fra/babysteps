// scripts/ingest/chunk.ts
//
// Splits parsed sections into embedding-sized chunks, 300-800 tokens, on § and Absatz
// boundaries. Reads data/cache/parsed.json, writes data/cache/chunks.json.
//
// THE RULE THAT SHAPES THIS FILE: never separate a § from its heading. Every chunk begins
// with "<section_ref> — <heading>" even when it is the fourth slice of a long section, so a
// retrieved fragment always carries the § it belongs to, both in the embedded text and in
// the metadata. A fragment that cannot name its own § is unusable in a cited answer.
//
// A chunk maps to EXACTLY ONE section. Short sections are therefore left short rather than
// merged with a neighbour: the playbook's 300-token floor cannot be honoured at the low end
// without packing two §§ into one chunk, which would make section_ref ambiguous and citation
// dishonest. Correctness beats the token target - CLAUDE.md's priority order.
//
// Token counts are ESTIMATED, not tokenised: no tokeniser is in the approved dependency list
// (CLAUDE.md rule 5). German averages ~3.5 characters per token on cl100k-style vocabularies,
// so the estimate is conservative and the 800 ceiling is set well inside the model's limit.
//
// Run: npx tsx scripts/ingest/chunk.ts

import { readFileSync, writeFileSync } from "node:fs";
import type { Section } from "./parse";

const IN = "data/cache/parsed.json";
const OUT = "data/cache/chunks.json";

const MAX_TOKENS = 800;
const MIN_TOKENS = 300;      // a target, not a guarantee — see the header note
const CHARS_PER_TOKEN = 3.5; // German estimate; documented, not measured per-model

export type Chunk = {
  content: string;
  section_ref: string;
  doc_title: string;
  source_url: string;
  jurisdiction: string;
  track: string;
  valid_from: string | null;
  corpus_version: string;
  source_id: string;
  part: number;
  of: number;
  est_tokens: number;
};

const estTokens = (s: string) => Math.ceil(s.length / CHARS_PER_TOKEN);

/** Sentence split for the rare Absatz that alone exceeds the ceiling. */
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.;:])\s+(?=[A-ZÄÖÜ(])/);
  return parts.length > 1 ? parts : [text];
}

/** Greedy pack of Absätze into <= MAX_TOKENS, never splitting one unless it alone is too big. */
function packUnits(units: string[], budget: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const unit of units) {
    const pieces = estTokens(unit) > budget ? splitSentences(unit) : [unit];
    for (const piece of pieces) {
      const candidate = cur ? `${cur}\n\n${piece}` : piece;
      if (cur && estTokens(candidate) > budget) {
        out.push(cur);
        cur = piece;
      } else {
        cur = candidate;
      }
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function chunkSection(s: Section): Chunk[] {
  const header = s.heading ? `${s.section_ref} — ${s.heading}` : s.section_ref;
  const headerCost = estTokens(header) + 2;
  const budget = MAX_TOKENS - headerCost;

  const units = s.text.split(/\n{2,}/).map((u) => u.trim()).filter(Boolean);
  const bodies = estTokens(s.text) <= budget ? [s.text] : packUnits(units, budget);

  return bodies.map((body, i) => {
    const content = `${header}\n\n${body}`;
    return {
      content,
      section_ref: s.section_ref,
      doc_title: s.doc_title,
      source_url: s.source_url,
      jurisdiction: s.jurisdiction,
      track: s.track,
      valid_from: s.valid_from,
      corpus_version: s.corpus_version,
      source_id: s.source_id,
      part: i + 1,
      of: bodies.length,
      est_tokens: estTokens(content),
    };
  });
}

function main() {
  const sections: Section[] = JSON.parse(readFileSync(IN, "utf8"));
  const chunks = sections.flatMap(chunkSection);
  writeFileSync(OUT, JSON.stringify(chunks, null, 2));

  // Per-source counts, which the Phase 2 gate asks to see.
  const bySource = new Map<string, number>();
  const byJurisdiction = new Map<string, number>();
  for (const c of chunks) {
    bySource.set(c.source_id, (bySource.get(c.source_id) ?? 0) + 1);
    byJurisdiction.set(c.jurisdiction, (byJurisdiction.get(c.jurisdiction) ?? 0) + 1);
  }

  console.log("source      sections  chunks   split sections");
  console.log("-".repeat(60));
  for (const [src, n] of bySource) {
    const secs = sections.filter((s) => s.source_id === src).length;
    const split = new Set(chunks.filter((c) => c.source_id === src && c.of > 1).map((c) => c.section_ref)).size;
    console.log(`${src.padEnd(11)} ${String(secs).padStart(8)} ${String(n).padStart(7)}   ${split}`);
  }

  console.log("\nper jurisdiction:");
  for (const [j, n] of byJurisdiction) console.log(`  ${j.padEnd(16)} ${n}`);

  const toks = chunks.map((c) => c.est_tokens).sort((a, b) => a - b);
  const pct = (p: number) => toks[Math.floor((toks.length - 1) * p)];
  const over = chunks.filter((c) => c.est_tokens > MAX_TOKENS);
  const under = chunks.filter((c) => c.est_tokens < MIN_TOKENS);
  const orphan = chunks.filter((c) => !c.content.startsWith(c.section_ref));

  console.log(`\ntotal chunks: ${chunks.length}`);
  console.log(`est tokens  min ${toks[0]}  p50 ${pct(0.5)}  p90 ${pct(0.9)}  max ${toks[toks.length - 1]}`);
  console.log(`over ${MAX_TOKENS}: ${over.length}${over.length ? " — " + over.map((c) => `${c.section_ref}(${c.est_tokens})`).join(", ") : ""}`);
  console.log(`under ${MIN_TOKENS}: ${under.length} (short §§ left unmerged on purpose — one chunk, one §)`);
  console.log(`chunks not starting with their section_ref: ${orphan.length}  <-- must be 0`);
  console.log(`written: ${OUT}`);
}

main();
