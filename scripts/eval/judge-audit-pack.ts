// scripts/eval/judge-audit-pack.ts
//
// Builds the human judge-audit pack: six verdicts, rendered for reading, with
// an agree/disagree line per call and no assessment of ours anywhere in it.
//
// Was a throwaway script on 2026-11-05 and again on 2026-11-06. It is committed
// now because the pack is read by people other than its author, and a rendering
// defect in it is a defect in what they are asked to judge — which is exactly
// what happened: the judge populates `quote` on prohibitions it marked NOT
// violated, and the first version printed that string under the prohibition as
// though it were the offending passage (ADR-068, action 3).
//
//   npx tsx scripts/eval/judge-audit-pack.ts <run-label> [--out <path>]
//   npx tsx scripts/eval/judge-audit-pack.ts 2026-11-06-iter13-judge-v6-1

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROWS = ["A-01", "A-17", "A-06", "A-21", "M-01", "R-05"];

const FLAGS = [
  "clinical_content",
  "redirect_present",
  "urgency_present",
  "refusal_present",
  "invented_claim",
  "uncited_legal_claim",
  "soft_deadline_as_statutory",
  "individual_case_verdict",
  "authority_named",
] as const;

type Element = { element: string; covered: boolean; why?: string };
type Prohibition = { clause: string; violated: boolean; quote?: string };
type Verdict = {
  elements?: Element[];
  must_not?: Prohibition[];
} & Record<string, unknown>;

type Row = {
  id: string;
  category: string;
  question: string;
  bundesland: string;
  kind: string;
  refusalReason?: string | null;
  reply?: string;
  verdict?: Verdict | null;
  criticals?: string[];
  failures?: string[];
  pass?: boolean;
};

type Run = {
  meta?: { golden_version?: string; prompts?: { answer?: string; judge?: string } };
  rows?: Row[];
};

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--"));
if (!label) {
  console.error("usage: npx tsx scripts/eval/judge-audit-pack.ts <run-label>");
  process.exit(1);
}
const outPath = args.includes("--out")
  ? args[args.indexOf("--out") + 1]
  : join("eval", "reports", `${label.slice(0, 10)}-judge-audit-pack.md`);

const run = JSON.parse(
  readFileSync(join(process.cwd(), "eval", "reports", `${label}.json`), "utf8"),
) as Run;
const rows = run.rows ?? [];

const indent = (t: string) =>
  t
    .split("\n")
    .map((l) => (l.trim() ? `    ${l}` : ""))
    .join("\n");
const quoteMd = (t: string) =>
  t
    .trim()
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

const stripVer = (s?: string) => (s ?? "").replace(/^(answer|judge)\./, "").replace(/\.md$/, "");

let suppressedQuotes = 0;

const L: string[] = [];
L.push(`# Judge audit pack (judge.${stripVer(run.meta?.prompts?.judge)}) — 2026-11-06`);
L.push(``);
L.push(`Six verdicts for human audit, from \`${label}\``);
L.push(`(answer.${stripVer(run.meta?.prompts?.answer)}, judge.${stripVer(run.meta?.prompts?.judge)}, golden ${run.meta?.golden_version}).`);
L.push(``);
L.push(`**Why this file replaces the 2026-11-05 pack.** That pack read judge.v5 at \`e223aeb\`.`);
L.push(`ADR-066 then changed what the judge is shown — the profile's Bundesland is now stated`);
L.push(`beside the category — and golden v1.12 rewrote A-01's second element, which had asked for`);
L.push(`a computation the answer layer is forbidden to make. Auditing v5 verdicts would audit a`);
L.push(`replaced instrument. The earlier file is kept, unaltered, in the same directory.`);
L.push(``);
L.push(`**Selection, stated.** The six rows are the ones composed under v5 — two ANSWER passes,`);
L.push(`two ANSWER fails, one DEFLECT, one REFUSE — held fixed deliberately, so the audit reads the`);
L.push(`same rows against the new judge. Four of them (A-01, A-17, A-06, A-21) were chosen under v5`);
L.push(`because their element coverage moved between two samples, making them the rows that decided`);
L.push(`the coverage gate. **That criterion could not be re-applied here: judge.v6 has exactly one`);
L.push(`sample, so there is no second run to measure churn against.** Checked against the earlier`);
L.push(`file: **one of the six changed label — R-05, FAIL under v5, PASS here.** Both the judge`);
L.push(`(v5 → v6) and the golden set (v1.11 → v1.12) changed between the two packs, so this file`);
L.push(`does not attribute the flip to either; it reports it so the audit is not surprised by it.`);
L.push(``);
L.push(`**Provenance.** \`${label}\` is **not a valid baseline**: a transport outage left M-10, R-01,`);
L.push(`R-02 and R-03 unmeasured (ADR-067). None of the six rows below is one of those four; each`);
L.push(`was measured and judged normally. The run's headline figures are unusable; these verdicts`);
L.push(`are not affected by the outage.`);
L.push(``);
L.push(`**Rendering.** On a prohibition the judge marked NOT violated, any \`quote\` it returned is`);
L.push(`**suppressed** here. It is not an offending passage — it is unrelated reply text — and`);
L.push(`printing it under the prohibition invited exactly the wrong reading. Violated clauses still`);
L.push(`show their quote, labelled.`);
L.push(``);
L.push(`This file contains no assessment of my own and no cross-run commentary. The question is only:`);
L.push(`**reading the reply against the element, do you agree with the judge's call?**`);
L.push(``);
L.push(`Disagree on 2 of 6 → the judge is unreliable and is fixed before any figure stands.`);
L.push(`Agree on 5 or 6 → the instrument is sound and the gates are what they are.`);
L.push(``);

for (const id of ROWS) {
  const x = rows.find((r) => r.id === id);
  if (!x) throw new Error(`row ${id} absent from ${label}`);
  const v = x.verdict ?? {};

  L.push(`---`, ``);
  L.push(`# ${id} — ${x.category} — judged ${x.pass ? "PASS" : "FAIL"}`);
  L.push(``);
  L.push(
    `Sample \`${label.slice(11)}\` · category ${x.category} · model returned \`${x.kind}\`` +
      (x.refusalReason ? ` (${x.refusalReason})` : ``) +
      ` · profile ${x.bundesland}`,
  );
  L.push(``, `## Question`, ``, `> ${x.question}`, ``);
  L.push(`## The reply, in full`, ``, indent(x.reply ?? "(no reply stored)"), ``);

  const els = v.elements ?? [];
  if (els.length) {
    L.push(`## Required elements, and the judge's call on each`, ``);
    els.forEach((e, i) => {
      L.push(`### ${i + 1}. ${e.element}`, ``);
      L.push(`**Judge: ${e.covered ? "COVERED" : "NOT COVERED"}**`, ``);
      L.push(quoteMd(e.why || "(no reason given)"), ``);
      L.push("`[ ] agree   [ ] disagree`   notes:", ``);
    });
  }

  const mn = v.must_not ?? [];
  if (mn.length) {
    L.push(`## Prohibitions (\`must_not_contain\`), and the judge's call on each`, ``);
    for (const c of mn) {
      L.push(`### ${c.clause}`, ``);
      if (c.violated) {
        L.push(`**Judge: VIOLATED**`, ``);
        L.push(`Quoted by the judge as the offending passage:`, ``);
        L.push(quoteMd(c.quote || "(no quote returned)"), ``);
      } else {
        L.push(`**Judge: not violated**`, ``);
        if (c.quote && c.quote.trim()) suppressedQuotes += 1;
      }
      L.push("`[ ] agree   [ ] disagree`   notes:", ``);
    }
  }

  const shown = FLAGS.filter((f) => v[f] !== null && v[f] !== undefined);
  if (shown.length) {
    L.push(`## Other judge flags on this row`, ``);
    for (const f of shown) {
      const why = v[`${f}_why`];
      const val = v[f];
      L.push(
        `- \`${f}\`: **${val === true ? "True" : val === false ? "False" : String(val)}**` +
          (typeof why === "string" && why ? ` — ${why}` : ``),
      );
    }
    L.push(``);
  }

  if ((x.criticals ?? []).length) {
    L.push(`## Criticals the judge raised`, ``);
    for (const c of x.criticals as string[]) L.push(`- ${c}`);
    L.push(``);
  }
  if ((x.failures ?? []).length) {
    L.push(`## What the harness scored as a failure`, ``);
    for (const f of x.failures as string[]) L.push(`- ${f}`);
    L.push(``);
  }
  L.push(`**Row outcome as scored: ${x.pass ? "PASS" : "FAIL"}**`, ``);
}

L.push(`---`, ``);
L.push(`## The six, at a glance`, ``);
L.push(`| row | category | elements covered | row outcome |`, `| --- | --- | --- | --- |`);
for (const id of ROWS) {
  const x = rows.find((r) => r.id === id) as Row;
  const els = x.verdict?.elements ?? [];
  L.push(
    `| ${id} | ${x.category} | ${els.filter((e) => e.covered).length}/${els.length} | ${x.pass ? "PASS" : "FAIL"} |`,
  );
}
L.push(``);
L.push(`## Rendering note`);
L.push(``);
L.push(`\`${suppressedQuotes}\` quote(s) returned on prohibitions the judge marked NOT violated were`);
L.push(`suppressed. That the judge populates the field at all on a clean clause is an instrument`);
L.push(`oddity worth knowing about, which is why the count is printed rather than the strings.`);
L.push(``);

writeFileSync(join(process.cwd(), outPath), L.join("\n"), "utf8");
console.log(`wrote ${outPath} · suppressed ${suppressedQuotes} spurious quote(s)`);
