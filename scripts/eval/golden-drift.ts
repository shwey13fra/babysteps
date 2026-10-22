// scripts/eval/golden-drift.ts
//
// The part of the Phase 2 gate that matters: check each high-priority row's
// required_answer_elements against the INGESTED TEXT of the source it cites, and report
// drift. This is annotation verification, not retrieval testing - whether a question
// happens to surface its source is a Phase 4/5 question, and the playbook reserves tuning
// for Session 5. A golden set whose ground truth was never read against the corpus
// measures the annotator's memory.
//
// Every number in an annotation is extracted and looked for in the cited §'s text. A
// number the statute does not contain is drift, or an inference the annotation should not
// be making. This tool reports; it never rewrites the CSV and never adjudicates an
// entitlement (CLAUDE.md rule 13).
//
// Run: npx tsx scripts/eval/golden-drift.ts

import { readFileSync, writeFileSync } from "node:fs";

const CSV = "data/golden/golden_set_v1.csv";
const PARSED = "data/cache/parsed.json";
const REPORT = "eval/reports/golden-drift-2026-10-22.md";

type Section = { section_ref: string | null; text: string; heading: string; source_url: string };

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

function statuteRefs(source: string): string[] {
  const out: string[] = [];
  const re = /\b(MuSchG|BEEG|BKGG|SGB V|BGB|StAG|AufenthG|PStG|EStG)\s*§\s*(\d+[a-z]?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(`${m[1]} §${m[2]}`);
  // The Kinder-Richtlinie is §-structured authoritative text, ingested from the PDF. It is
  // cited by name rather than by §, so expand it to the sections carrying the examination
  // schedule: §2 holds the Zeitraum/Toleranzgrenze table and §3–§12 are U1–U9.
  if (/Kinder-Richtlinie|Kinder-RL/i.test(source)) {
    for (let n = 2; n <= 12; n++) out.push(`Kinder-RL §${n}`);
  }
  return [...new Set(out)];
}

/** Numbers an annotation asserts, normalised so "175000" matches the statute's "175 000". */
function numbersIn(text: string): string[] {
  const out = new Set<string>();
  // No \b anchors. English ordinals ("3rd", "10th") and attached labels ("U1") put a
  // letter straight after the digit, so a trailing boundary match silently extracts
  // nothing and every such row passes vacuously — which is how A-17 first "confirmed"
  // with zero numbers checked.
  for (const m of text.matchAll(/\d[\d.,\s]*\d|\d/g)) {
    const digits = m[0].replace(/[^\d]/g, "");
    if (digits.length >= 1 && Number(digits) > 0) out.add(digits);
  }
  return [...out];
}

/**
 * German statutes spell small numbers out — "sieben Wochen", not "7 Wochen" — so a digit
 * check alone reports drift that is not there. Both forms count as present.
 */
const GERMAN_WORDS: Record<string, string[]> = {
  "1": ["ein", "eine", "einem", "einer", "eines"], "2": ["zwei"], "3": ["drei"], "4": ["vier"],
  "5": ["fünf"], "6": ["sechs"], "7": ["sieben"], "8": ["acht"], "9": ["neun"], "10": ["zehn"],
  "11": ["elf"], "12": ["zwölf"], "13": ["dreizehn"], "14": ["vierzehn"], "15": ["fünfzehn"],
  "16": ["sechzehn"], "18": ["achtzehn"], "20": ["zwanzig"], "21": ["einundzwanzig"],
  "24": ["vierundzwanzig"], "30": ["dreißig"], "32": ["zweiunddreißig"], "36": ["sechsunddreißig"],
  "100": ["hundert"], "365": ["dreihundertfünfundsechzig"],
};

/** Does the statute contain this number, as digits (any German grouping) or as a word? */
function hasNumber(text: string, digits: string): boolean {
  const plain = text.replace(/[ \s.]/g, "");
  if (plain.includes(digits)) return true;
  const lower = text.toLowerCase();
  return (GERMAN_WORDS[digits] ?? []).some((w) => new RegExp(`\\b${w}`, "i").test(lower));
}

function main() {
  const sections: Section[] = JSON.parse(readFileSync(PARSED, "utf8"));
  const byRef = new Map<string, Section>();
  for (const s of sections) if (s.section_ref && !byRef.has(s.section_ref)) byRef.set(s.section_ref, s);

  const rows = readCsv(readFileSync(CSV, "utf8")).filter((r) => r.verify_priority === "high" && r.category === "ANSWER");

  const lines: string[] = [
    "# Golden set v1 — annotation drift against ingested text",
    "",
    "Date: 2026-10-22 · corpus_version 2026-10 · 675 chunks",
    "",
    "Each row's `required_answer_elements` is checked against the **ingested text of the §**",
    "it cites, not against retrieval. Numbers asserted by the annotation are looked for in the",
    "statute. A number the statute does not contain is drift, or an inference the annotation",
    "should not be making from that source.",
    "",
    "This report does not adjudicate entitlement (CLAUDE.md rule 13). Rows marked **DECIDE**",
    "assert an amount or threshold and need a human.",
    "",
  ];

  let drifted = 0;
  let confirmed = 0;
  let unverifiable = 0;

  for (const r of rows) {
    const refs = statuteRefs(r.ground_truth_source);
    const texts = refs.map((x) => byRef.get(x)).filter(Boolean) as Section[];
    const corpus = texts.map((t) => t.text).join("\n");
    const nums = numbersIn(r.required_answer_elements);

    if (!refs.length) {
      unverifiable++;
      lines.push(`### ${r.id} — ${r.ground_truth_source}`, "", `**UNVERIFIABLE (non-statute source).** ${r.question}`, "");
      continue;
    }
    if (!texts.length) {
      unverifiable++;
      lines.push(`### ${r.id} — ${r.ground_truth_source}`, "", `**NOT IN CORPUS.** ${refs.join(", ")}`, "");
      continue;
    }

    const found = nums.filter((n) => hasNumber(corpus, n));
    const absent = nums.filter((n) => !hasNumber(corpus, n));
    const verdict = absent.length ? "DRIFT?" : "CONFIRMED";
    if (absent.length) drifted++; else confirmed++;

    lines.push(
      `### ${r.id} — ${r.ground_truth_source} — **${verdict}**`,
      "",
      `*${r.question}*`,
      "",
      `- annotation: ${r.required_answer_elements}`,
      `- numbers found in the §: ${found.join(", ") || "none"}`,
      `- **numbers NOT in the §: ${absent.join(", ") || "none"}**`,
      "",
    );
    console.log(`${verdict.padEnd(10)} ${r.id.padEnd(6)} ${r.ground_truth_source.slice(0, 34).padEnd(35)} absent: ${absent.join(", ") || "-"}`);
  }

  lines.splice(11, 0, `| confirmed | drift? | unverifiable |`, `| --- | --- | --- |`, `| ${confirmed} | ${drifted} | ${unverifiable} |`, "");
  writeFileSync(REPORT, lines.join("\n"));
  console.log(`\nconfirmed ${confirmed} · drift? ${drifted} · unverifiable ${unverifiable}`);
  console.log(`report: ${REPORT}`);
}

main();
