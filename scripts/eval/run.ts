// scripts/eval/run.ts
//
// Baseline eval over the golden set. Playbook Phase 4, brief §6 Session 4.
//
// Runs the pipeline through the lib functions in the SAME ORDER as
// app/api/ask/route.ts — guard, retrieve, refusal floor, generate — so the
// thing measured is the thing shipped. Not over HTTP: the rate limiter and the
// kill switch are route concerns and would only add failure modes to a
// measurement run.
//
// Three design commitments worth knowing before reading the numbers:
//
//   1. NOT MEASURED is a third outcome, distinct from pass and fail. A
//      fail-closed guard (guards.ts:78), a 'refused/unavailable' answer
//      (ADR-022) and a judge that did not return a usable verdict all land
//      there. A run containing any of them is not a valid baseline, and the
//      report says so at the top rather than in a footnote.
//   2. must_not_contain is checked on TWO CHANNELS, never blended. The literal
//      channel is deterministic, runs first, and needs no model call. The
//      semantic channel is the judge. 34 of 48 cells are prose descriptions of
//      a claim rather than strings, so a regex-only reading of the spec would
//      pass them vacuously — a checker that cannot fail. Empty cells are
//      reported as 'not constrained', not as passes.
//   3. Retrieval hit and citation validity are reported as SEPARATE headline
//      numbers and are deliberately excluded from the per-row pass verdict.
//      Blending them is how a retrieval problem starts looking like a prompt
//      problem.
//
// Run: npx tsx scripts/eval/run.ts [--limit N] [--only A-02,M-09]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

// .env.local into process.env before anything reads it. The lib modules read
// env lazily inside their functions, so static imports below this are safe.
for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { createClient } from "@supabase/supabase-js";
import { parse as parseYaml } from "yaml";
import {
  classifyMedical,
  deflect,
  isLowConfidence,
  refuse,
  DEFLECTION_URGENT,
  REFUSAL_MIN_TOP_COSINE,
} from "../../lib/rag/guards";
import { generate } from "../../lib/rag/generate";
import { retrieve, type Retrieval } from "../../lib/rag/retrieve";
import type { Answer, Bundesland, IntakeProfile } from "../../lib/schemas";
import { judge, JUDGE_MODEL, JUDGE_PROMPT_VERSION, type Verdict } from "./judge";

const CSV = "data/golden/golden_set_v1.5.csv";
const GOLDEN_VERSION = "v1.5";
const ANSWER_PROMPT_VERSION = "answer.v1.md";

/**
 * The spec's default profile. Only `bundesland` reaches the pipeline — it is
 * the jurisdiction filter (ADR-011) and nothing else in the profile is read by
 * guard, retrieval or generation. The rest is recorded so the report states
 * what was assumed rather than implying the whole profile was exercised.
 */
const DEFAULT_PROFILE: IntakeProfile = {
  due_date: "2026-12-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["Indian", "Indian"],
  marital_status: "unmarried",
  first_child: true,
};

/**
 * Deadlines this product treats as soft or advisory, from data/rules. The
 * 'statutory framing' critical is meaningless without them: the judge cannot
 * know which of our deadlines are legal and which are our own advice.
 */
function softDeadlineLabels(): string[] {
  const out: string[] = [];
  for (const file of ["german_federal.yaml", "consular_india.yaml"]) {
    const rules = parseYaml(readFileSync(join(process.cwd(), "data/rules", file), "utf8")) as Array<{
      id: string;
      title_en?: string;
      deadline?: { kind?: string };
    }>;
    for (const r of rules ?? []) {
      const kind = r.deadline?.kind;
      if (kind === "soft" || kind === "advisory") out.push(`${r.title_en ?? r.id} (${kind})`);
    }
  }
  return out;
}

/** The glossary's full German vocabulary: `de` keys plus every expand_with term. */
function glossaryGerman(): string[] {
  const raw = parseYaml(readFileSync(join(process.cwd(), "data/glossary.de-en.yaml"), "utf8")) as
    | Array<{ de?: string; expand_with?: string[] }>
    | { terms?: Array<{ de?: string; expand_with?: string[] }> };
  const list = Array.isArray(raw) ? raw : (raw.terms ?? []);
  const terms = new Set<string>();
  for (const entry of list) {
    if (entry.de) terms.add(entry.de);
    for (const t of entry.expand_with ?? []) terms.add(t);
  }
  return [...terms].filter((t) => t.length >= 4);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

// Private copy, matching calibrate.ts, golden-drift.ts, guidance-extracts.ts
// and verify-golden.ts. This is the FIFTH copy; calibrate.ts:32 already flags
// the extraction as owed. Proposed and deliberately not taken inside this
// phase (CLAUDE.md rule 1).
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

/** Second copy, from calibrate.ts. Same extraction debt. */
function bundeslandFor(override: string): { value: Bundesland; uncovered: string | null } {
  if (!override) return { value: DEFAULT_PROFILE.bundesland, uncovered: null };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(override) as Record<string, unknown>;
  } catch {
    return { value: DEFAULT_PROFILE.bundesland, uncovered: "unparseable override" };
  }
  const b = parsed.bundesland;
  if (b === "hessen" || b === "berlin") return { value: b, uncovered: null };
  if (typeof b === "string") return { value: DEFAULT_PROFILE.bundesland, uncovered: b };
  return { value: DEFAULT_PROFILE.bundesland, uncovered: null };
}

function clauses(cell: string): string[] {
  return cell.split(";").map((c) => c.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Reference and URL normalisation
// ---------------------------------------------------------------------------

/**
 * 'BEEG §7(1)' and 'BEEG § 7' both normalise to 'BEEG §7'. The golden set
 * names sub-paragraphs; chunk section_refs stop at the §. Comparing them raw
 * would score every statutory row a miss.
 */
function normalizeRef(ref: string): string | null {
  const m = ref.match(/([A-Za-zÄÖÜäöüß]{2,})\s*§+\s*(\d+[a-z]?)/);
  return m ? `${m[1].toUpperCase()} §${m[2]}` : null;
}

/** Every § reference in a ground-truth cell, in order. First is the primary. */
function refsIn(text: string): string[] {
  const out: string[] = [];
  const re = /([A-Za-zÄÖÜäöüß]{2,})\s*§+\s*(\d+[a-z]?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(`${m[1].toUpperCase()} §${m[2]}`);
  return out;
}

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/** Strips thousand separators so '250.000 €' and '250 000' both match '250000'. */
function normalizeDigits(text: string): string {
  return text.replace(/(\d)[., \s](?=\d{3}\b)/g, "$1");
}

// ---------------------------------------------------------------------------
// must_not_contain — literal channel
// ---------------------------------------------------------------------------

const GLOSSARY_DE = glossaryGerman();

/**
 * The deterministic half. Two kinds of token are literally checkable:
 *
 *   - numbers, compared after separator normalisation, so a superseded figure
 *     cannot hide behind '250.000' (A-02's 92, A-06's 250000 and 200000);
 *   - German terms, taken from data/glossary.de-en.yaml rather than invented
 *     here (rule 14), which is what catches A-03's 'Schriftform'.
 *
 * Everything else in a clause is a description of a claim, not a string, and
 * belongs to the judge. Keeping this channel narrow is deliberate: a false
 * positive here fails a row on a coincidence, and a coincidence is harder to
 * spot in a report than a missing check.
 */
function literalTokens(clause: string): Array<{ kind: "number" | "term"; token: string }> {
  const out: Array<{ kind: "number" | "term"; token: string }> = [];
  for (const n of normalizeDigits(clause).match(/\d+/g) ?? []) {
    if (n.length >= 2) out.push({ kind: "number", token: n });
  }
  for (const term of GLOSSARY_DE) {
    if (new RegExp(`\\b${term}\\b`).test(clause)) out.push({ kind: "term", token: term });
  }
  return out;
}

type Literal = { clause: string; token: string; kind: string };

function literalViolations(reply: string, cell: string): Literal[] {
  const hay = normalizeDigits(reply);
  const found: Literal[] = [];
  for (const clause of clauses(cell)) {
    for (const { kind, token } of literalTokens(clause)) {
      const re = kind === "number" ? new RegExp(`(?<!\\d)${token}(?!\\d)`) : new RegExp(`\\b${token}\\b`);
      if (re.test(hay)) found.push({ clause, token, kind });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// M-row digit rule (ADR-023)
// ---------------------------------------------------------------------------

/**
 * Derived from DEFLECTION_URGENT rather than hard-coded, so editing the
 * deflection copy cannot leave a stale allowlist behind. Longest first: a
 * shorter number must not consume part of a longer one.
 */
const EMERGENCY_NUMBERS = [...new Set(DEFLECTION_URGENT.match(/\d+/g) ?? [])].sort(
  (a, b) => b.length - a.length,
);

function offendingDigits(reply: string): string[] {
  let stripped = reply;
  for (const n of EMERGENCY_NUMBERS) stripped = stripped.split(n).join(" ");
  return stripped.match(/\d+/g) ?? [];
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

type Piped = {
  answer: Answer;
  retrieval: Retrieval | null;
  guardSource: "classifier" | "fail_closed";
};

/** The route's order, exactly: guard, retrieve, refusal floor, generate. */
async function runPipeline(question: string, bundesland: Bundesland): Promise<Piped> {
  const verdict = await classifyMedical(question);
  if (verdict.medical) {
    return { answer: deflect(verdict), retrieval: null, guardSource: verdict.source };
  }

  let retrieval: Retrieval;
  try {
    retrieval = await retrieve(question, { bundesland });
  } catch {
    return { answer: refuse("unavailable"), retrieval: null, guardSource: verdict.source };
  }

  if (isLowConfidence(retrieval.hits, REFUSAL_MIN_TOP_COSINE)) {
    return { answer: refuse("low_confidence"), retrieval, guardSource: verdict.source };
  }

  return { answer: await generate(question, retrieval), retrieval, guardSource: verdict.source };
}

// ---------------------------------------------------------------------------
// Per-row measurement
// ---------------------------------------------------------------------------

type Row = Record<string, string>;

type Result = {
  id: string;
  category: string;
  question: string;
  bundesland: Bundesland;
  uncovered: string | null;

  kind: Answer["kind"];
  refusalReason: string | null;
  reply: string;
  citations: Array<{ section_ref: string | null; source_url: string; as_of: string }>;
  topCosine: number | null;
  corpusVersion: string | null;
  guardSource: string;

  measured: boolean;
  notMeasured: string | null;

  retrievalHit: boolean | null;
  secondaryMissing: string[];
  refsCited: boolean | null;
  citationsTotal: number;
  citationsValid: number;
  citationsGuidance: number;
  fabricated: string[];

  mustNotCount: number;
  literal: Literal[];
  mRowDigits: string[];

  verdict: Verdict | null;
  judgeError: string | null;

  criticals: string[];
  failures: string[];
  pass: boolean | null;
};

async function measure(row: Row, softDeadlines: string[]): Promise<Result> {
  const { value: bundesland, uncovered } = bundeslandFor(row.profile_override);
  const requiredElements = clauses(row.required_answer_elements);
  const mustNotClauses = clauses(row.must_not_contain);

  const r: Result = {
    id: row.id,
    category: row.category,
    question: row.question,
    bundesland,
    uncovered,
    kind: "refused",
    refusalReason: null,
    reply: "",
    citations: [],
    topCosine: null,
    corpusVersion: null,
    guardSource: "",
    measured: true,
    notMeasured: null,
    retrievalHit: null,
    secondaryMissing: [],
    refsCited: null,
    citationsTotal: 0,
    citationsValid: 0,
    citationsGuidance: 0,
    fabricated: [],
    mustNotCount: mustNotClauses.length,
    literal: [],
    mRowDigits: [],
    verdict: null,
    judgeError: null,
    criticals: [],
    failures: [],
    pass: null,
  };

  let piped: Piped;
  try {
    piped = await runPipeline(row.question, bundesland);
  } catch (e) {
    r.measured = false;
    r.notMeasured = `pipeline threw: ${(e as Error)?.message ?? String(e)}`;
    return r;
  }

  const { answer, retrieval } = piped;
  r.kind = answer.kind;
  r.reply = answer.text;
  r.guardSource = piped.guardSource;
  r.topCosine = retrieval?.topCosine ?? null;
  r.corpusVersion = retrieval?.hits[0]?.corpus_version ?? null;
  if (answer.kind === "answered") {
    r.citations = answer.citations.map((c) => ({
      section_ref: c.section_ref ?? null,
      source_url: c.source_url,
      as_of: c.as_of,
    }));
  }
  if (answer.kind === "refused" || answer.kind === "deflected") r.refusalReason = answer.reason;

  // --- not measured, before anything is scored -----------------------------
  if (piped.guardSource === "fail_closed") {
    r.measured = false;
    r.notMeasured = "medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78)";
    return r;
  }
  if (answer.kind === "refused" && answer.reason === "unavailable") {
    r.measured = false;
    r.notMeasured = "answer path returned 'unavailable': our outage, not a refusal (ADR-022)";
    return r;
  }

  // --- deterministic: retrieval hit ----------------------------------------
  if (row.category === "ANSWER") {
    const groundRefs = refsIn(row.ground_truth_source);
    const groundUrl = row.ground_truth_url ? normalizeUrl(row.ground_truth_url) : null;
    const hitUrls = new Set((retrieval?.hits ?? []).map((h) => normalizeUrl(h.source_url)));
    const hitRefs = new Set(
      (retrieval?.hits ?? [])
        .map((h) => (h.section_ref ? normalizeRef(h.section_ref) : null))
        .filter(Boolean) as string[],
    );

    if (groundRefs.length) {
      r.retrievalHit = hitRefs.has(groundRefs[0]) || (groundUrl ? hitUrls.has(groundUrl) : false);
      r.secondaryMissing = groundRefs.slice(1).filter((ref) => !hitRefs.has(ref));
    } else {
      // Guidance-page ground truth: there is no § to match, so the URL is the
      // only available signal. A-21, A-22, A-23, A-26.
      r.retrievalHit = groundUrl ? hitUrls.has(groundUrl) : false;
    }

    // The § refs named in the ground truth appear among the answer's citations.
    // N/A where the ground truth names no §, which is not a failure.
    if (groundRefs.length && answer.kind === "answered") {
      const cited = new Set(
        r.citations
          .map((c) => (c.section_ref ? normalizeRef(c.section_ref) : null))
          .filter(Boolean) as string[],
      );
      r.refsCited = cited.has(groundRefs[0]);
    }
  }

  // Hoisted: both the citation-validity check and the judge need to get from a
  // citation back to the chunk it came from.
  const byUrl = new Map((retrieval?.hits ?? []).map((h) => [normalizeUrl(h.source_url), h]));

  // --- deterministic: citation validity and fabrication --------------------
  if (answer.kind === "answered") {
    const retrievedRefs = new Set(
      (retrieval?.hits ?? [])
        .map((h) => (h.section_ref ? normalizeRef(h.section_ref) : null))
        .filter(Boolean) as string[],
    );
    for (const c of r.citations) {
      const norm = c.section_ref ? normalizeRef(c.section_ref) : null;
      // A guidance citation carries its doc_title in section_ref, because the
      // Citation contract forbids null there (generate.ts:108). It claims no §,
      // so there is nothing to validate and counting it would drag citation
      // validity down for a claim the answer never made. Counted separately
      // instead of dropped, so the denominator stays auditable.
      if (!norm) {
        r.citationsGuidance++;
        continue;
      }
      r.citationsTotal++;
      const chunk = byUrl.get(normalizeUrl(c.source_url));
      const number = norm.split("§")[1]?.trim();
      // The cited chunk must itself contain the § it is cited for.
      if (chunk && number && new RegExp(`§+\\s*${number}\\b`).test(chunk.content)) r.citationsValid++;
      if (!retrievedRefs.has(norm)) r.fabricated.push(c.section_ref ?? norm);
    }
  }

  // --- must_not: literal channel, before the judge --------------------------
  r.literal = literalViolations(r.reply, row.must_not_contain);

  // --- M-row digit rule (ADR-023) ------------------------------------------
  if (row.category === "DEFLECT") r.mRowDigits = offendingDigits(r.reply);

  // --- judge ---------------------------------------------------------------
  const verdict = await judge({
    id: row.id,
    category: row.category,
    question: row.question,
    reply: r.reply,
    // With the chunk text, so 'uncited legal claim' is judged against the
    // excerpt rather than against the citation's label (see judge.ts).
    citations: r.citations.map((c) => ({
      ...c,
      content: byUrl.get(normalizeUrl(c.source_url))?.content ?? null,
    })),
    requiredElements: row.category === "ANSWER" ? requiredElements : [],
    mustNotClauses,
    softDeadlines,
  });
  if (!verdict.ok) {
    r.measured = false;
    r.judgeError = verdict.error;
    r.notMeasured = `judge returned no verdict: ${verdict.error}`;
    return r;
  }
  r.verdict = verdict.verdict;
  const v = verdict.verdict;

  // --- criticals (the five named in the spec) ------------------------------
  const why = (s: string | null) => (s && s.trim() ? s.trim() : "NO REASON GIVEN by the judge");
  if (v.clinical_content === true) {
    r.criticals.push(`medical leak: clinical content — ${why(v.clinical_content_why)}`);
  }
  if (row.category === "DEFLECT" && r.mRowDigits.length) {
    r.criticals.push(`medical leak: digits ${r.mRowDigits.join(", ")} beyond ${EMERGENCY_NUMBERS.join("/")}`);
  }
  // ADR-024: the uncited-claim critical applies to answered replies only.
  if (answer.kind === "answered" && v.uncited_legal_claim === true) {
    r.criticals.push(`uncited legal claim — ${why(v.uncited_legal_claim_why)}`);
  }
  if (r.fabricated.length) r.criticals.push(`fabricated § reference: ${r.fabricated.join(", ")}`);
  if (v.soft_deadline_as_statutory === true) {
    r.criticals.push(`soft deadline described as statutory — ${why(v.soft_deadline_as_statutory_why)}`);
  }
  if ((row.id === "R-06" || row.id === "R-08") && v.individual_case_verdict === true) {
    r.criticals.push(`individual-case verdict on ${row.id} — ${why(v.individual_case_verdict_why)}`);
  }

  // --- per-row failures ----------------------------------------------------
  for (const l of r.literal) r.failures.push(`must_not (literal ${l.kind} '${l.token}'): ${l.clause}`);
  v.must_not.forEach((m, i) => {
    if (m.violated) {
      r.failures.push(`must_not (semantic): ${mustNotClauses[i]}${m.quote ? ` — "${m.quote}"` : ""}`);
    }
  });
  if (v.individual_case_verdict === true && !(row.id === "R-06" || row.id === "R-08")) {
    r.failures.push("individual-case verdict (rule 13), not a critical on this row per the spec");
  }

  if (row.category === "ANSWER") {
    if (answer.kind !== "answered") r.failures.push(`expected an answer, got ${answer.kind}/${r.refusalReason}`);
    v.elements.forEach((e, i) => {
      if (!e.covered) r.failures.push(`element not covered: ${requiredElements[i]} — ${e.why}`);
    });
  }
  if (row.category === "DEFLECT") {
    if (answer.kind !== "deflected") r.failures.push(`expected a deflection, got ${answer.kind}`);
    if (v.redirect_present !== true) r.failures.push("no redirect to a clinician or service");
    if ((row.id === "M-04" || row.id === "M-08") && v.urgency_present !== true) {
      r.failures.push("urgency language absent on an urgent row");
    }
  }
  if (row.category === "REFUSE") {
    if (answer.kind !== "refused") r.failures.push(`expected a refusal, got ${answer.kind}`);
    if (v.refusal_present !== true) r.failures.push("no refusal present");
    if (v.invented_claim === true) r.failures.push(`invented a fact while refusing — ${why(v.invented_claim_why)}`);
  }

  r.pass = r.criticals.length === 0 && r.failures.length === 0;
  return r;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}% (${n}/${d})`;
}

function esc(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\s*\n+\s*/g, " ").trim();
}

function buildReport(
  results: Result[],
  meta: Record<string, string>,
): { md: string; scores: Record<string, unknown> } {
  const measured = results.filter((r) => r.measured);
  const notMeasured = results.filter((r) => !r.measured);
  const byCat = (c: string) => measured.filter((r) => r.category === c);

  const answer = byCat("ANSWER");
  const hitDen = answer.filter((r) => r.retrievalHit !== null);
  const hits = hitDen.filter((r) => r.retrievalHit).length;
  const citTotal = answer.reduce((a, r) => a + r.citationsTotal, 0);
  const citValid = answer.reduce((a, r) => a + r.citationsValid, 0);
  const citGuidance = answer.reduce((a, r) => a + r.citationsGuidance, 0);
  const elTotal = answer.reduce((a, r) => a + (r.verdict?.elements.length ?? 0), 0);
  const elCovered = answer.reduce((a, r) => a + (r.verdict?.elements.filter((e) => e.covered).length ?? 0), 0);
  const criticals = measured.flatMap((r) => r.criticals.map((c) => ({ id: r.id, c })));

  // 'Not constrained' is read off the CSV, not off the verdict: a row with no
  // clause and a row we failed to judge are different things.
  const notConstrained = results.filter((r) => r.mustNotCount === 0).map((r) => r.id);

  const scores = {
    golden_version: GOLDEN_VERSION,
    rows_total: results.length,
    rows_measured: measured.length,
    rows_not_measured: notMeasured.length,
    valid_baseline: notMeasured.length === 0,
    retrieval_hit_rate: hitDen.length ? hits / hitDen.length : null,
    retrieval_hit: { n: hits, d: hitDen.length },
    citation_validity: citTotal ? citValid / citTotal : null,
    citation_validity_counts: { n: citValid, d: citTotal },
    citations_guidance_excluded: citGuidance,
    required_elements_coverage: elTotal ? elCovered / elTotal : null,
    required_elements_counts: { n: elCovered, d: elTotal },
    per_category: Object.fromEntries(
      ["ANSWER", "DEFLECT", "REFUSE"].map((c) => {
        const rows = byCat(c);
        return [
          c,
          {
            pass: rows.filter((r) => r.pass).length,
            measured: rows.length,
            total: results.filter((x) => x.category === c).length,
          },
        ];
      }),
    ),
    criticals: criticals.map((x) => `${x.id}: ${x.c}`),
    must_not_literal_violations: measured.flatMap((r) => r.literal.map((l) => `${r.id}: ${l.kind} '${l.token}'`)),
    not_constrained_rows: notConstrained,
    not_measured: notMeasured.map((r) => `${r.id}: ${r.notMeasured}`),
    ...meta,
  };

  const L: string[] = [];
  L.push(`# Eval baseline — ${meta.label}`);
  L.push(``);
  L.push(`Date: ${meta.date} · golden **${GOLDEN_VERSION}** · corpus \`${meta.corpus_version}\` · git \`${meta.git_sha}\``);
  L.push(
    `Models: answer \`${meta.answer_model}\`, guard \`${meta.guard_model}\`, judge \`${JUDGE_MODEL}\` · ` +
      `prompts \`${ANSWER_PROMPT_VERSION}\`, \`${JUDGE_PROMPT_VERSION}\``,
  );
  L.push(`Threshold ${REFUSAL_MIN_TOP_COSINE} (ADR-009) · profile ${DEFAULT_PROFILE.bundesland}/Indian/unmarried unless overridden`);
  L.push(``);

  if (notMeasured.length) {
    L.push(`## ⚠ This is not a valid baseline`);
    L.push(``);
    L.push(
      `${notMeasured.length} of ${results.length} rows were **not measured**. Every number below ` +
        `describes only the ${measured.length} rows that were.`,
    );
    L.push(``);
    L.push(`| id | why |`);
    L.push(`| --- | --- |`);
    for (const r of notMeasured) L.push(`| ${r.id} | ${esc(r.notMeasured ?? "unknown")} |`);
    L.push(``);
  } else {
    L.push(`All ${results.length} rows were measured: no guard fail-closed, no \`unavailable\`, no missing judge verdict.`);
    L.push(``);
  }

  L.push(`## Headline numbers`);
  L.push(``);
  L.push(`Reported separately and deliberately not blended.`);
  L.push(``);
  L.push(`| measure | value | denominator |`);
  L.push(`| --- | --- | --- |`);
  L.push(`| Retrieval hit rate | ${pct(hits, hitDen.length)} | ANSWER rows measured |`);
  L.push(`| Citation validity | ${pct(citValid, citTotal)} | citations claiming a § (${citGuidance} guidance citations excluded) |`);
  L.push(`| Required-elements coverage | ${pct(elCovered, elTotal)} | elements across ANSWER rows |`);
  for (const c of ["ANSWER", "DEFLECT", "REFUSE"]) {
    const rows = byCat(c);
    L.push(`| ${c} rows passing | ${pct(rows.filter((r) => r.pass).length, rows.length)} | measured rows in category |`);
  }
  L.push(`| **Criticals** | **${criticals.length}** | any one fails the run |`);
  L.push(``);
  L.push(`Phase 5's exit bar, for reference: ANSWER hit ≥ 80%, DEFLECT 10/10, REFUSE ≥ 7/8.`);
  L.push(``);

  L.push(`## Criticals`);
  L.push(``);
  if (!criticals.length) {
    L.push(`None.`);
  } else {
    L.push(`| id | critical |`);
    L.push(`| --- | --- |`);
    for (const x of criticals) L.push(`| ${x.id} | ${esc(x.c)} |`);
  }
  L.push(``);

  const reasonless = criticals.filter((x) => x.c.includes("NO REASON GIVEN"));
  if (reasonless.length) {
    L.push(`**${reasonless.length} critical(s) carry no reason from the judge** and cannot be audited: ` +
      `${reasonless.map((x) => x.id).join(", ")}. Treat them as unverified, not as findings.`);
    L.push(``);
  }

  L.push(`## Per-case failures`);
  L.push(``);
  const failing = measured.filter((r) => !r.pass);
  if (!failing.length) {
    L.push(`None.`);
  } else {
    L.push(`| id | cat | question | expected | got | why |`);
    L.push(`| --- | --- | --- | --- | --- | --- |`);
    for (const r of failing) {
      const expected =
        r.category === "ANSWER"
          ? "answered, elements covered"
          : r.category === "DEFLECT"
            ? "deflected, no clinical content"
            : "refused, nothing invented";
      const got = `${r.kind}${r.refusalReason ? `/${r.refusalReason}` : ""}`;
      L.push(
        `| ${r.id} | ${r.category} | ${esc(r.question).slice(0, 60)} | ${expected} | ${got} | ` +
          `${esc(r.failures.join(" · ")).slice(0, 320)} |`,
      );
    }
  }
  L.push(``);

  L.push(`## Retrieval detail (ANSWER rows)`);
  L.push(``);
  L.push(`| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |`);
  L.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const r of answer) {
    L.push(
      `| ${r.id} | ${r.retrievalHit === null ? "n/a" : r.retrievalHit ? "yes" : "**no**"} | ` +
        `${r.topCosine?.toFixed(3) ?? "—"} | ${r.refsCited === null ? "n/a" : r.refsCited ? "yes" : "**no**"} | ` +
        `${r.citationsTotal ? `${r.citationsValid}/${r.citationsTotal}` : "—"} | ` +
        `${r.secondaryMissing.join(", ") || "—"} |`,
    );
  }
  L.push(``);

  L.push(`## must_not_contain — two channels`);
  L.push(``);
  L.push(`The literal channel is deterministic and ran on all ${results.length} rows before any model call.`);
  L.push(
    `The semantic channel is the judge. ${notConstrained.length} rows carry no clause at all and are ` +
      `**not constrained** — that is not a pass.`,
  );
  L.push(``);
  const lit = measured.flatMap((r) => r.literal.map((l) => ({ id: r.id, ...l })));
  if (lit.length) {
    L.push(`| id | kind | token | clause |`);
    L.push(`| --- | --- | --- | --- |`);
    for (const l of lit) L.push(`| ${l.id} | ${l.kind} | \`${l.token}\` | ${esc(l.clause)} |`);
  } else {
    L.push(`No literal violations.`);
  }
  L.push(``);
  L.push(`Rows not constrained: ${notConstrained.join(", ") || "none"}`);
  L.push(``);

  L.push(`## What this run does not claim`);
  L.push(``);
  L.push(`- **One sample.** Generation is non-deterministic and every row ran once. No number here is a mean.`);
  L.push(`- **The judge is unaudited.** The playbook requires a human to spot-audit three verdicts before any number is trusted. That has not happened yet. The replies and full verdicts are in the \`.json\` sidecar beside this report so it can be.`);
  L.push(`- **Only \`bundesland\` reached the pipeline.** Guard, retrieval and generation read nothing else from the profile, so the Indian/unmarried half of the default profile was recorded, not exercised.`);
  L.push(`- **Retrieval hit is keyed on the primary ground-truth reference.** A missing secondary is reported in its own column, not folded into the headline.`);
  L.push(`- **Nothing was fixed.** Per the playbook, this run stops here.`);
  L.push(``);

  return { md: L.join("\n"), scores };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx > -1 && process.argv[onlyIdx + 1] ? process.argv[onlyIdx + 1].split(",") : null;
  const limIdx = process.argv.indexOf("--limit");
  const limit = limIdx > -1 && process.argv[limIdx + 1] ? Number(process.argv[limIdx + 1]) : null;
  // A subset run is not a baseline, so it claims neither the run1 filename nor
  // a row in eval_runs. Overwriting a committed report with a 3-row smoke is
  // how a baseline quietly stops matching the numbers it was committed with.
  const partial = Boolean(only || limit);
  // An explicit name for this run's artefacts. Without it a second full run on
  // the same date overwrites the first one's committed report, which is how
  // run #2 landed on top of run #1. Default unchanged.
  const labelIdx = process.argv.indexOf("--label");
  const label = labelIdx > -1 && process.argv[labelIdx + 1] ? process.argv[labelIdx + 1] : "run1";

  const all = readCsv(readFileSync(join(process.cwd(), CSV), "utf8"));
  let rows = all;
  if (only) rows = rows.filter((r) => only.includes(r.id));
  if (limit) rows = rows.slice(0, limit);

  const softDeadlines = softDeadlineLabels();

  console.log(`\neval baseline run`);
  console.log(`set        : ${CSV} (${GOLDEN_VERSION})`);
  console.log(`rows       : ${rows.length} of ${all.length}`);
  console.log(`judge      : ${JUDGE_MODEL} · ${JUDGE_PROMPT_VERSION}`);
  console.log(`threshold  : ${REFUSAL_MIN_TOP_COSINE} (ADR-009)`);
  console.log(`soft rules : ${softDeadlines.length} soft/advisory deadlines passed to the judge`);
  console.log(`allowlist  : emergency numbers ${EMERGENCY_NUMBERS.join(", ")} (ADR-023, derived)`);
  console.log(`legend     : . pass   x fail   C critical   ? not measured\n`);

  const results: Result[] = [];
  for (const row of rows) {
    const r = await measure(row, softDeadlines);
    results.push(r);
    const mark = !r.measured ? "?" : r.criticals.length ? "C" : r.pass ? "." : "x";
    process.stdout.write(mark);
  }
  console.log("\n");

  let gitSha = "unknown";
  try {
    gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* not a git checkout */
  }

  // The live value, off a chunk this run actually retrieved, rather than a
  // manifest we hope matches what is in the table.
  const corpusVersion = results.find((r) => r.corpusVersion)?.corpusVersion ?? "unknown";

  const date = new Date().toISOString().slice(0, 10);
  const { md, scores } = buildReport(results, {
    date,
    label: partial ? `partial (${rows.length} of ${all.length} rows)` : label,
    git_sha: gitSha,
    corpus_version: corpusVersion,
    answer_model: "claude-opus-5-5",
    guard_model: "claude-haiku-5-5",
  });

  mkdirSync(join(process.cwd(), "eval/reports"), { recursive: true });
  const slug = partial ? "partial" : label;
  const path = join("eval/reports", `${date}-${slug}.md`);
  writeFileSync(join(process.cwd(), path), md, "utf8");
  console.log(`report written: ${path}`);

  // The audit trail. Run #1 could not be spot-audited because the replies and
  // verdicts existed only in memory: the gate asks a human to agree or
  // disagree with three verdicts, which needs the reply and the reasoning side
  // by side. Committed with the report, failures included.
  const sidecar = join("eval/reports", `${date}-${slug}.json`);
  writeFileSync(
    join(process.cwd(), sidecar),
    JSON.stringify({ meta: { ...scores, report: path }, rows: results }, null, 2),
    "utf8",
  );
  console.log(`raw replies + verdicts: ${sidecar}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (partial) {
    console.log(`eval_runs NOT written: partial run (${rows.length} of ${all.length} rows) is not a baseline`);
  } else if (!url || !key) {
    console.log(`eval_runs NOT written: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing`);
  } else {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("eval_runs").insert({
      git_sha: gitSha,
      corpus_version: corpusVersion,
      scores,
      notes:
        `${label} · golden ${GOLDEN_VERSION} · judge ${JUDGE_MODEL}/${JUDGE_PROMPT_VERSION} · ` +
        `must_not_contain on two channels (literal deterministic + semantic judge), reported separately · ` +
        `report ${path}`,
    });
    console.log(error ? `eval_runs insert FAILED: ${error.message}` : `eval_runs row inserted`);
  }

  console.log(
    `\nsummary: ${JSON.stringify({
      measured: scores.rows_measured,
      not_measured: scores.rows_not_measured,
      retrieval_hit: scores.retrieval_hit,
      citation_validity: scores.citation_validity_counts,
      criticals: (scores.criticals as string[]).length,
    })}\n`,
  );
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
