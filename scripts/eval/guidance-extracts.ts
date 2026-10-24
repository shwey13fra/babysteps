// scripts/eval/guidance-extracts.ts
//
// Prepares the four non-statute golden rows for human adjudication. For each, prints the
// annotation beside the INGESTED TEXT of the pages it is supposed to rest on, so the claim
// can be checked against the source rather than from memory.
//
// These rows cannot be verified the way statute rows were: there is no § to match, so
// scripts/eval/golden-drift.ts can say nothing about them. This produces the evidence a
// human needs and stops there — it does not judge whether the annotation is right.
//
// Run: npx tsx scripts/eval/guidance-extracts.ts

import { readFileSync, writeFileSync } from "node:fs";

const CSV = "data/golden/golden_set_v1.2.csv";
const PARSED = "data/cache/parsed.json";
const REPORT = "eval/reports/golden-guidance-extracts-2026-10-22.md";

type Section = {
  source_id: string;
  section_ref: string | null;
  heading: string;
  text: string;
  source_url: string;
  doc_title: string;
};

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

/** Which ingested pages each row is supposed to rest on, and what to look for in them. */
const TARGETS: Record<string, { sources: string[]; urlMatch?: RegExp; keywords: string[] }> = {
  "A-17": { sources: ["gba_kinder_richtlinie"], keywords: ["U1", "U2", "U3", "Lebenstag", "Woche", "Früherkennung", "Untersuchung"] },
  "A-21": { sources: ["hessen_rp"], keywords: ["Elterngeldstelle", "zuständig", "Wohnsitz", "Antrag", "Hessen", "Kreis", "Stadt"] },
  "A-22": { sources: ["berlin_service"], keywords: ["Elterngeldstelle", "Jugendamt", "Bezirk", "zuständig", "Wohnsitz", "Antrag"] },
  "A-23": { sources: ["familienportal"], urlMatch: /elterngeld-digital/, keywords: ["online", "digital", "ElterngeldDigital", "Bundesland", "Antrag"] },
};

function main() {
  const sections: Section[] = JSON.parse(readFileSync(PARSED, "utf8"));
  const rows = Object.fromEntries(readCsv(readFileSync(CSV, "utf8")).map((r) => [r.id, r]));

  // Derived, not hardcoded — same reason as golden-drift.ts: a report that states a version
  // literal keeps stating it after the tool is pointed somewhere else.
  const setName = CSV.replace(/^.*golden_set_/, "").replace(/\.csv$/, "");

  const out: string[] = [
    `# Golden set ${setName} — evidence for the four non-statute rows`,
    "",
    `Date: ${new Date().toISOString().slice(0, 10)} · corpus_version \`2026-10\``,
    "",
    "These rows cite guidance, not statute, so there is no § to match and",
    "`scripts/eval/golden-drift.ts` can say nothing about them. Below is each annotation",
    "beside the ingested text of the page it rests on. **Nothing here is a judgement** —",
    "the point is to put the claim and the source next to each other so a human can decide.",
    "",
    "For each row: ✅ means the keyword appears in the ingested text, ❌ means it does not.",
    "A missing keyword is not proof the claim is wrong — it may mean the detail lives on a",
    "page or PDF we did not ingest, which is itself worth knowing.",
    "",
  ];

  for (const [id, t] of Object.entries(TARGETS)) {
    const r = rows[id];
    let pages = sections.filter((s) => t.sources.includes(s.source_id));
    if (t.urlMatch) pages = pages.filter((s) => t.urlMatch!.test(s.source_url));

    const all = pages.map((p) => p.text).join("\n");
    const hits = t.keywords.map((k) => [k, new RegExp(`\\b${k}`, "i").test(all)] as const);

    out.push(
      `## ${id} — ${r.ground_truth_source}`,
      "",
      `**Question:** ${r.question}`,
      "",
      `**Annotation requires:** ${r.required_answer_elements}`,
      "",
      `**Ingested pages:** ${pages.length} section(s) from \`${t.sources.join(", ")}\``,
      pages.length ? `(${[...new Set(pages.map((p) => p.source_url))].join(" · ")})` : "(none)",
      "",
      `**Keyword presence:** ${hits.map(([k, v]) => `${v ? "✅" : "❌"} ${k}`).join("  ")}`,
      "",
    );

    if (!pages.length) {
      out.push("> **No ingested text for this source.** The claim cannot be checked against the corpus.", "");
      continue;
    }

    out.push("<details><summary>Ingested text</summary>", "");
    for (const p of pages) {
      out.push(`### ${p.heading || "(no heading)"}`, "", "```", p.text.slice(0, 1800), "```", "");
    }
    out.push("</details>", "");
    console.log(`${id}  ${pages.length} sections, ${all.length} chars  |  ${hits.filter(([, v]) => v).length}/${hits.length} keywords present`);
  }

  writeFileSync(REPORT, out.join("\n"));
  console.log(`\nreport: ${REPORT}`);
}

main();
