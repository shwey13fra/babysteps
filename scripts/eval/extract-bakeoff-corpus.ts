// scripts/eval/extract-bakeoff-corpus.ts
//
// Builds data/raw/bakeoff-corpus.json, the input to embedding-bakeoff.ts, from the
// official gesetze-im-internet XML archives. Statute text is copied verbatim; nothing
// is paraphrased or invented (CLAUDE.md rules 4 and 14, ADR-012/013).
//
// Prerequisite — fetch the archives into data/raw/ (gitignored, never committed):
//   for s in muschg_2018 beeg bkgg_1996 sgb_5; do
//     curl -A "BabyStepsBot/0.1" -o "data/raw/$s.xml.zip" \
//       "https://www.gesetze-im-internet.de/$s/xml.zip"
//     mkdir -p "data/raw/x_$s" && (cd "data/raw/x_$s" && unzip -oq "../$s.xml.zip")
//   done
//
// This is bake-off scaffolding, superseded by scripts/ingest/{fetch,parse,chunk}.ts in
// Phase 2 step 3. It exists so today's ADR-007 measurement stays reproducible.
//
// Run: npx tsx scripts/eval/extract-bakeoff-corpus.ts

import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const STATUTES: Record<string, string> = {
  MuSchG: "data/raw/x_muschg_2018",
  BEEG: "data/raw/x_beeg",
  BKGG: "data/raw/x_bkgg",
  "SGB V": "data/raw/x_sgb_5",
};

// Five targets, one per playbook query pair, and five topically adjacent distractors:
// a high rank has to discriminate within the subject area, not merely find it.
const PICK: [string, string, "target" | "distractor"][] = [
  ["MuSchG", "§ 3", "target"],
  ["MuSchG", "§ 17", "target"],
  ["BEEG", "§ 7", "target"],
  ["BKGG", "§ 9", "target"],
  ["SGB V", "§ 24d", "target"],
  ["MuSchG", "§ 16", "distractor"],
  ["MuSchG", "§ 7", "distractor"],
  ["BEEG", "§ 4", "distractor"],
  ["BEEG", "§ 2", "distractor"],
  ["BKGG", "§ 6", "distractor"],
];

const clean = (s: string) =>
  s
    .replace(/<BR\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const cache: Record<string, Record<string, { titel: string; text: string }>> = {};

function sectionsOf(statute: string) {
  if (cache[statute]) return cache[statute];
  const dir = STATUTES[statute];
  const xmlFile = readdirSync(dir).find((f) => f.endsWith(".xml"));
  if (!xmlFile) throw new Error(`no .xml in ${dir} — run the curl/unzip step in the header first`);
  const xml = readFileSync(`${dir}/${xmlFile}`, "utf8");
  const out: Record<string, { titel: string; text: string }> = {};
  for (const m of xml.matchAll(/<norm\b[^>]*>([\s\S]*?)<\/norm>/g)) {
    const body = m[1];
    const enbez = /<enbez>([\s\S]*?)<\/enbez>/.exec(body)?.[1];
    if (!enbez) continue;
    out[clean(enbez)] = {
      titel: clean(/<titel[^>]*>([\s\S]*?)<\/titel>/.exec(body)?.[1] ?? ""),
      text: clean(/<textdaten>([\s\S]*?)<\/textdaten>/.exec(body)?.[1] ?? ""),
    };
  }
  return (cache[statute] = out);
}

const corpus = [];
for (const [statute, ref, role] of PICK) {
  const sec = sectionsOf(statute)[ref];
  if (!sec) throw new Error(`${statute} ${ref} not found in the XML`);
  // First two sentences of the operative text: enough to retrieve on, short enough to read.
  const sentences = sec.text.split(/(?<=\.)\s+(?=[A-ZÄÖÜ(])/).filter((s) => s.length > 40);
  corpus.push({
    id: `${statute} ${ref}`,
    role,
    title: sec.titel,
    text: `${statute} ${ref} ${sec.titel}. ${sentences.slice(0, 2).join(" ").slice(0, 600)}`,
  });
}

writeFileSync("data/raw/bakeoff-corpus.json", JSON.stringify(corpus, null, 2));
console.log(`Wrote ${corpus.length} sections to data/raw/bakeoff-corpus.json`);
for (const c of corpus) console.log(`  [${c.role.padEnd(10)}] ${c.id.padEnd(12)} ${c.title.slice(0, 50)}`);
