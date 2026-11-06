// scripts/eval/verbatim-presence.ts
//
// Can the instrument read?
//
// A-21 element 1 was judged NOT COVERED with the reason "it never names the
// HÄVS or states that Hessen has six such offices". The reply contains, in so
// many words, "the six Hessische Ämter für Versorgung und Soziales". Text
// present, judged absent — a defect class that fails in the OPPOSITE direction
// to the false positives already in the judge's negative examples: it
// SUPPRESSES coverage rather than inventing criticals (ADR-068).
//
// This sweep is deterministic and makes no model calls. For every element any
// stored sample marked NOT COVERED, it extracts the distinctive literals from
// the element's own text and greps the stored reply for them.
//
// WHAT A FLAG IS. A flag means the judge's verdict is checkable against the
// text and worth a human read. It is NOT proof the element is covered: an
// element can name an authority the reply also names while still asking for a
// claim the reply never makes. Every flag is listed with the literal that
// matched, so each can be upheld or dismissed by reading. Nothing here rescores
// anything.
//
// STRONG means a multi-word proper name matched — near-conclusive, because such
// a name appears only where that authority is actually named. Everything else
// is WEAK on its own: a glossary term like 'Elterngeld' appears in almost every
// reply, and a § reference is normalised to the paragraph, so an element asking
// for §12(1) matches a reply citing §12(3).
//
//   npx tsx scripts/eval/verbatim-presence.ts [--row A-21] [--quiet]

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { elementLiterals, literalPresent, type ElementLiteral } from "./literals";

const REPORTS = join(process.cwd(), "eval", "reports");

const KIND_RANK: Record<string, number> = { authority: 0, number: 1, ref: 2, term: 3 };

type StoredElement = { element: string; covered: boolean; why?: string };
type StoredRow = {
  id: string;
  category: string;
  reply?: string;
  verdict?: { elements?: StoredElement[] } | null;
};
type StoredRun = {
  meta?: { coverage_exclusions?: { elements?: Array<{ row: string; element: string }> } };
  rows?: StoredRow[];
};

type Flag = {
  sample: string;
  row: string;
  category: string;
  element: string;
  why: string;
  matched: ElementLiteral[];
  excluded: boolean;
};

const args = process.argv.slice(2);
const onlyRow = args.includes("--row") ? args[args.indexOf("--row") + 1] : null;
const quiet = args.includes("--quiet");

const files = readdirSync(REPORTS)
  .filter((f) => f.endsWith(".json"))
  .sort();

const flags: Flag[] = [];
const perSample: Array<{ sample: string; notCovered: number; flagged: number; rowsRead: number; skipped: boolean }> = [];

for (const file of files) {
  const sample = file.replace(/\.json$/, "");
  let run: StoredRun;
  try {
    run = JSON.parse(readFileSync(join(REPORTS, file), "utf8")) as StoredRun;
  } catch {
    perSample.push({ sample, notCovered: 0, flagged: 0, rowsRead: 0, skipped: true });
    continue;
  }
  if (!Array.isArray(run.rows)) {
    // corpus snapshots and probe outputs live in this directory too
    perSample.push({ sample, notCovered: 0, flagged: 0, rowsRead: 0, skipped: true });
    continue;
  }

  const excluded = new Set(
    (run.meta?.coverage_exclusions?.elements ?? []).map((e) => `${e.row}\u0000${e.element}`),
  );

  let notCovered = 0;
  let flagged = 0;
  let rowsRead = 0;

  for (const row of run.rows) {
    if (onlyRow && row.id !== onlyRow) continue;
    const els = row.verdict?.elements;
    const reply = row.reply;
    if (!els || !reply) continue;
    rowsRead += 1;
    for (const el of els) {
      if (el.covered !== false) continue;
      notCovered += 1;
      const matched = elementLiterals(el.element)
        .filter((l) => literalPresent(l, reply))
        .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
      if (!matched.length) continue;
      flagged += 1;
      flags.push({
        sample,
        row: row.id,
        category: row.category,
        element: el.element,
        why: el.why ?? "",
        matched,
        excluded: excluded.has(`${row.id}\u0000${el.element}`),
      });
    }
  }
  perSample.push({ sample, notCovered, flagged, rowsRead, skipped: false });
}

// ---------------------------------------------------------------------------
// Grouped by the thing that needs a human read: the element itself
// ---------------------------------------------------------------------------

type Group = {
  row: string;
  category: string;
  element: string;
  samples: string[];
  matched: ElementLiteral[];
  why: string;
  excluded: boolean;
  /**
   * One entry per flagged sample, each with THAT sample's own reason. A single
   * representative `why` is not safe to print: the judge words the same verdict
   * differently run to run, and on A-21 exactly one sample of four asserted the
   * text was absent while the other three acknowledged it and gave a
   * substantive reason. Printing one as the group's reason invites attributing
   * it to all of them.
   */
  instances: Array<{ sample: string; why: string; matched: ElementLiteral[] }>;
};

// Strength is a property of a FLAG, not of a (row, element) pair: in one sample
// the authority name matched, in another only 'Elterngeld' did. An earlier
// version of this script merged `matched` across samples and then tested the
// union, which labelled a group STRONG on one sample's evidence and reported
// every sample that matched anything as if it had matched the name. Group
// within a strength class, never across one.
const isStrongFlag = (f: Flag) => f.matched.some((m) => m.kind === "authority");

function group(fs: Flag[]): Group[] {
  const m = new Map<string, Group>();
  for (const f of fs) {
    const k = `${f.row}\u0000${f.element}`;
    const g = m.get(k);
    if (g) {
      g.samples.push(f.sample);
      g.instances.push({ sample: f.sample, why: f.why, matched: f.matched });
      for (const x of f.matched) {
        if (!g.matched.some((y) => y.kind === x.kind && y.token === x.token)) g.matched.push(x);
      }
      g.matched.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
    } else {
      m.set(k, {
        ...f,
        samples: [f.sample],
        matched: [...f.matched],
        instances: [{ sample: f.sample, why: f.why, matched: f.matched }],
      });
    }
  }
  return [...m.values()];
}

const byRow = (a: Group, b: Group) => b.samples.length - a.samples.length || a.row.localeCompare(b.row);

const strongFlags = flags.filter(isStrongFlag);
const strong = group(strongFlags).sort(byRow);
const weak = group(flags.filter((f) => !isStrongFlag(f))).sort(byRow);
const all = [...strong, ...weak];

const read = perSample.filter((s) => !s.skipped);
const totalNotCovered = read.reduce((n, s) => n + s.notCovered, 0);
const totalFlagged = read.reduce((n, s) => n + s.flagged, 0);

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n+\s*/g, " ").trim();
const lits = (ms: ElementLiteral[]) => ms.map((m) => `${m.kind}: \`${m.token}\``).join("; ");

const L: string[] = [];
L.push(`# Verbatim-presence sweep — can the instrument read?`);
L.push(``);
L.push(`Deterministic. No model calls, nothing spent. \`npx tsx scripts/eval/verbatim-presence.ts\`.`);
L.push(``);
L.push(`For every element any stored sample marked **NOT COVERED**, the distinctive literals in the`);
L.push(`element's own text are grepped against that sample's stored reply. A flag means **text`);
L.push(`present, judged absent** — the A-21 element 1 defect class (ADR-068).`);
L.push(``);
L.push(`**A flag is a candidate, not a correction.** An element can name an authority the reply also`);
L.push(`names while still asking for a claim the reply never makes. Each flag carries the literal`);
L.push(`that matched so it can be upheld or dismissed by reading. This script rescores nothing.`);
L.push(``);
L.push(`**Strong vs weak.** STRONG = a multi-word proper name matched, which is near-conclusive`);
L.push(`because such a name appears only where that authority is actually named. WEAK = only a`);
L.push(`number, a § reference or a glossary term matched: \`Elterngeld\` appears in almost every`);
L.push(`reply, and a § reference is normalised to the paragraph (\`citations.ts:60\`), so an element`);
L.push(`asking for §12(1) matches a reply citing §12(3).`);
L.push(``);
L.push(`## Headline`);
L.push(``);
L.push(`| | count |`);
L.push(`| --- | --- |`);
L.push(`| Files in \`eval/reports/\` | ${files.length} |`);
L.push(`| Of those, scored runs with rows and verdicts | ${read.length} |`);
L.push(`| NOT COVERED element verdicts examined | **${totalNotCovered}** |`);
L.push(`| Flagged element verdicts | **${totalFlagged}** |`);
L.push(`| Flagged verdicts where a named authority matched (**STRONG**) | **${strongFlags.length}** |`);
L.push(`| Distinct (row, element) pairs with at least one STRONG flag | **${strong.length}** |`);
L.push(`| Distinct (row, element) pairs with WEAK flags only | ${weak.length} |`);
L.push(``);

const section = (title: string, gs: Group[], note: string) => {
  L.push(`## ${title}`);
  L.push(``);
  if (!gs.length) {
    L.push(`None.`);
    L.push(``);
    return;
  }
  L.push(note);
  L.push(``);
  L.push(`| row | cat | element | literal present in the reply | samples |`);
  L.push(`| --- | --- | --- | --- | --- |`);
  for (const g of gs) {
    L.push(
      `| ${g.row}${g.excluded ? " *(excl.)*" : ""} | ${g.category} | ${esc(g.element)} | ${lits(g.matched)} | ${g.samples.length} |`,
    );
  }
  L.push(``);
  for (const g of gs) {
    L.push(`### ${g.row} — ${g.category}${g.excluded ? " — already excluded from the gate (ADR-019)" : ""}`);
    L.push(``);
    L.push(`**Element:** ${esc(g.element)}`);
    L.push(``);
    L.push(`**Present in the reply:** ${lits(g.matched)}`);
    L.push(``);
    L.push(`**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per`);
    L.push(`element: the same verdict is worded differently run to run, and a reason that explains`);
    L.push(`why the literal is not enough is a sound verdict, not a misread.`);
    L.push(``);
    for (const inst of g.instances) {
      L.push(`- **${inst.sample}** — ${lits(inst.matched)}`);
      L.push(`  - judge: ${esc(inst.why) || "(no reason stored)"}`);
      L.push("  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`");
    }
    L.push(``);
  }
};

section(
  "STRONG flags",
  strong,
  `A multi-word authority name from the element appears verbatim in the reply the judge said lacked it.`,
);
section(
  "WEAK flags",
  weak,
  `Listed for completeness. A single glossary term or a paragraph-level § match is not by itself evidence of a misread — most of these are expected and should be dismissed.`,
);

if (all.some((g) => g.excluded)) {
  L.push(`\`(excl.)\` marks an element already excluded from the gate under ADR-019, so upholding it`);
  L.push(`would not move the scorable figure.`);
  L.push(``);
}

L.push(`## Per sample`);
L.push(``);
L.push(`| sample | rows with verdicts | NOT COVERED | flagged |`);
L.push(`| --- | --- | --- | --- |`);
for (const s of read) L.push(`| ${s.sample} | ${s.rowsRead} | ${s.notCovered} | ${s.flagged} |`);
L.push(``);
const skipped = perSample.filter((s) => s.skipped);
if (skipped.length) {
  L.push(`Not scored runs, skipped: ${skipped.map((s) => `\`${s.sample}\``).join(", ")}.`);
  L.push(``);
}

const out = join(REPORTS, "verbatim-presence-sweep.md");
writeFileSync(out, L.join("\n"), "utf8");

if (!quiet) {
  console.log(
    `files=${files.length} scored=${read.length} notCovered=${totalNotCovered} flagged=${totalFlagged} distinct=${all.length} strong=${strong.length} weak=${weak.length}`,
  );
  console.log("STRONG:");
  for (const g of strong) {
    console.log(`  ${g.row.padEnd(5)} ${g.category.padEnd(7)} x${String(g.samples.length).padEnd(3)} ${g.excluded ? "[excl] " : ""}${lits(g.matched)}`);
  }
  console.log("WEAK:");
  for (const g of weak) {
    console.log(`  ${g.row.padEnd(5)} ${g.category.padEnd(7)} x${String(g.samples.length).padEnd(3)} ${g.excluded ? "[excl] " : ""}${lits(g.matched)}`);
  }
  console.log(`wrote ${out}`);
}
