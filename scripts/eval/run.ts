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

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, basename } from "node:path";

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
  refuse,
  DEFLECTION_URGENT,
  REFUSAL_MIN_TOP_COSINE,
} from "../../lib/rag/guards";
import { answerOrRefuse } from "../../lib/rag/generate";
import { retrieve, type Retrieval } from "../../lib/rag/retrieve";
import type { ChunkHit } from "../../lib/supabase/server";
import type { Answer, Bundesland, IntakeProfile } from "../../lib/schemas";
import { judge, JUDGE_MODEL, JUDGE_PROMPT_VERSION, type Verdict } from "./judge";
import { clauses, parseElement, prohibitionCoverage } from "./clauses";
import { normalizeRef, normalizeUrl, refsIn, scoreCitations } from "./citations";
import {
  assertSingleSource,
  exclusionFor,
  loadExclusions,
  rowWhollyExcluded,
  validateExclusions,
  type Exclusion,
} from "./exclusions";
import { formatUsage, snapshot } from "../../lib/rag/usage";
import { readCsv } from "./csv";
import {
  anthropicAlive,
  assertAlive,
  assertBudget,
  estimateRun,
  loadBudget,
  recordSpend,
} from "../preflight";

const CSV = "data/golden/golden_set_v1.11.csv";
// DERIVED, not declared, since 2026-11-05 (ADR-064). These were two constants
// holding one fact. Bumping CSV to v1.11 and leaving GOLDEN_VERSION at "v1.10"
// mislabelled BOTH iter12 baselines: they loaded v1.11 — proved by R-06's
// requirement text in their own sidecars — and reported golden v1.10 in the
// report header, the meta and the eval_runs note. The data was right and the
// label was wrong, which is the harder defect to catch, because every figure
// reconciles.
//
// Throws rather than falling back: a version string that silently degrades to a
// default is the same class of defect one step quieter.
const GOLDEN_VERSION = (() => {
  const m = CSV.match(/_v(\d+\.\d+)\.csv$/);
  if (!m) throw new Error(`cannot derive the golden version from ${CSV} — rename it or fix the pattern`);
  return `v${m[1]}`;
})();
const ANSWER_PROMPT_VERSION = "answer.v5.md";

// ---------------------------------------------------------------------------
// Structural coverage exclusions (ADR-019 amendment, 2026-11-02)
// ---------------------------------------------------------------------------
//
// Until this existed there was NO exclusion mechanism here: the single
// coverage figure counted every ANSWER element, the consular 8 included, and
// the two reports that excluded them did it in hand-written prose. The rule
// "every report carries both figures" could not be honoured by the code that
// writes the reports. Now it is, and the exclusions are data.
//
// Keyed by row id + the requirement text AFTER parseElement() strips markers,
// never by index: a positional key rots the next time a golden version
// reorders a cell, and would then exclude a different element in silence.

const EXCLUSIONS_FILE = "data/golden/coverage-exclusions.yaml";

// ONE list, two denominators. The coverage rule (ADR-043) and the retrieval rule
// (ADR-050) both live in `exclusions.ts`, where the retrieval rule is defined as
// a predicate OVER the coverage entries rather than as a second list that has to
// agree with them by hand. `assertSingleSource` is the standing check the human
// ruled for on 2026-11-04 and runs before the first model call.
const EXCLUSIONS: Exclusion[] = loadExclusions(EXCLUSIONS_FILE);
const exclusionIn = (rowId: string, element: string) => exclusionFor(EXCLUSIONS, rowId, element);
const wholly = (row: Row) => rowWhollyExcluded(EXCLUSIONS, row);

const VARIANCE_FILE = "data/golden/variance-band.yaml";

type Band = {
  observed?: number[];
  observed_numerator?: number[];
  observed_denominator?: number[];
  adjudicated?: number[];
  movement: number;
  movement_row_identity?: number;
  unit: string;
  denominator?: number;
  /** The all-rows denominator, where the gate figure uses a smaller one. */
  denominator_all?: number;
  depends_on: string[];
  /**
   * Set when the MEASURE itself changed, not a configuration component.
   *
   * `depends_on` and `measured_under` can only express "something this band is
   * sensitive to has moved" — they cannot express "this number is no longer
   * the same quantity". ADR-051's mechanism; ADR-049 is the case that needed it: it changed how
   * citation validity is computed, so the 94.2–94.6% band describes a measure
   * that no longer exists, while the retrieval band re-expressed exactly
   * (A-24 and A-26 were misses in all three samples, so dropping them moves
   * only the denominator). One band invalid, one band carried over, and no
   * configuration component moved for either.
   */
  invalidated_by?: string;
  /**
   * Components this band has been RE-SCOPED to, after proving the change could
   * not move it (ADR-052). Checked before the global `measured_under`, so the
   * band reads current for those components and stale for any other.
   *
   * The band file's rule 2 says to list a component in `depends_on` unless the
   * band provably cannot move with it — conservative, and right. This is the
   * other half of that rule: when the proof does exist for one specific change,
   * the alternative is printing a stale warning that is known to be false, and
   * a known-false warning is worse than none (human ruling 5c, 2026-11-04).
   * Every entry needs `rescoped_why` carrying the proof.
   */
  rescoped_to?: Record<string, string>;
  rescoped_why?: string;
  note: string;
};

type VarianceFile = {
  version?: number;
  measured_under: Record<string, string>;
  samples: { n: number; labels: string[]; note?: string };
  bands: Record<string, Band>;
};

/**
 * The observed run-to-run movement with every input fixed (ADR-048).
 *
 * A zero-tolerance threshold on a stochastic measure is not a gate, it is a
 * lottery: variance-2 raised a critical on inputs identical to iter7's, which
 * had none. So no gate figure is printed without its band beside it, and a
 * single-sample number with no n is not reported as a result.
 */
const VARIANCE: VarianceFile = parseYaml(
  readFileSync(join(process.cwd(), VARIANCE_FILE), "utf8"),
) as VarianceFile;

/**
 * Which configuration components have moved since the band was measured.
 *
 * A band is only valid for the configuration it was measured under, so this is
 * what stops a stale band being quoted as current. Each band declares the
 * components it is sensitive to; any overlap with this list and the report says
 * STALE rather than printing a number nobody measured. judge.v5 is exactly why
 * the check exists: it invalidates the criticals and coverage bands measured
 * under v4 while leaving the retrieval band, which involves no judgement, intact.
 */
function configDrift(corpusVersion: string): string[] {
  const live: Record<string, string> = {
    golden: GOLDEN_VERSION,
    judge: JUDGE_PROMPT_VERSION,
    answer: ANSWER_PROMPT_VERSION,
    corpus: corpusVersion,
  };
  // `"unknown"` means UNDETERMINED, not changed. corpus_version is read off a
  // chunk this run retrieved, so a run that retrieved nothing — 0 rows, or
  // --only on an id that does not exist — cannot know it, and every band
  // depending on corpus then printed `stale - measured before corpus changed`
  // against a corpus that had not moved at all. Verified: corpus_version is
  // `2026-10` on all 30 ANSWER rows, matching measured_under.
  //
  // A known-false warning is worse than no warning: false ones get ignored, and
  // then a true one gets ignored too. Undetermined components are reported as
  // undetermined by the caller instead.
  return Object.keys(live).filter(
    (k) => live[k] !== "unknown" && VARIANCE.measured_under[k] !== live[k],
  );
}

/** Components whose live value this run could not establish. Never "changed". */
function configUndetermined(corpusVersion: string): string[] {
  return corpusVersion === "unknown" ? ["corpus"] : [];
}

/**
 * Throws BEFORE the first model call if the band file is internally
 * inconsistent. Same reasoning as validateExclusions: a band is quoted in a
 * committed report as the reason a number is or is not evidence, so a band
 * whose declared n does not match its samples would launder an assumption into
 * the audit trail.
 */
function validateVariance(): void {
  const problems: string[] = [];
  const v = VARIANCE;
  if (v.samples.n !== v.samples.labels.length) {
    problems.push(`samples.n is ${v.samples.n} but ${v.samples.labels.length} labels are listed`);
  }
  for (const [key, b] of Object.entries(v.bands)) {
    const series = b.observed ?? b.observed_numerator;
    if (!series) {
      problems.push(`${key}: neither observed nor observed_numerator is set`);
      continue;
    }
    if (series.length !== v.samples.n) {
      problems.push(`${key}: ${series.length} observations for n=${v.samples.n}`);
    }
    if (b.observed_numerator && (b.observed_denominator ?? []).length !== series.length) {
      problems.push(`${key}: numerator and denominator series differ in length`);
    }
    if (b.adjudicated && b.adjudicated.length !== series.length) {
      problems.push(`${key}: ${b.adjudicated.length} adjudicated values for ${series.length} observations`);
    }
    if (!b.depends_on?.length) {
      problems.push(`${key}: depends_on is empty - a band sensitive to nothing cannot go stale`);
    }
    // ADR-052: a re-scope suppresses a stale warning, so it must carry its proof
    // and must name a component the band actually depends on. Without this, a
    // typo in `rescoped_to` would silently certify a band as current.
    for (const comp of Object.keys(b.rescoped_to ?? {})) {
      if (!b.depends_on.includes(comp)) {
        problems.push(`${key}: rescoped_to names "${comp}", which is not in depends_on`);
      }
    }
    if (b.rescoped_to && !b.rescoped_why?.trim()) {
      problems.push(`${key}: rescoped_to is set with no rescoped_why - a re-scope needs its proof`);
    }
    if (b.rescoped_why && !b.rescoped_to) {
      problems.push(`${key}: rescoped_why is set with no rescoped_to`);
    }
  }
  if (problems.length) {
    throw new Error(
      [`${VARIANCE_FILE} is internally inconsistent:`, ...problems.map((t) => `  - ${t}`)].join("\n"),
    );
  }
}

/** A band's staleness: the components it depends on that have since moved. */
function bandStale(key: string, drift: string[], live: Record<string, string>): string[] {
  const b = VARIANCE.bands[key];
  if (!b) return [];
  // A component this band was re-scoped to is NOT stale for this band, even
  // though it drifted globally (ADR-052). The re-scoped value is compared
  // against the LIVE one: a band re-scoped to golden v1.9 must go stale again
  // the moment the set becomes v2.0, or one proof would excuse every future
  // change. `rescoped_why` carries the proof and validateVariance refuses a
  // re-scope without one.
  return b.depends_on.filter(
    (d) => drift.includes(d) && (b.rescoped_to ?? {})[d] !== live[d],
  );
}

/** The movement column: the band, or why it cannot be quoted. */
function bandCell(key: string, drift: string[], live: Record<string, string>): string {
  const b = VARIANCE.bands[key];
  if (!b) return `not measured`;
  // A changed measure outranks configuration drift: there is no point saying a
  // number moved by ±n units when n was counted on a different quantity.
  if (b.invalidated_by) return `**invalid** - ${b.invalidated_by}`;
  const stale = bandStale(key, drift, live);
  const base = `+/- ${b.movement} ${b.unit} (n=${VARIANCE.samples.n})`;
  return stale.length ? `**stale** - ${base}, measured before \`${stale.join("`, `")}\` changed` : base;
}

/**
 * Section completion (ADR-032), ON — and it is THIS run's single variable.
 *
 * It was set false for the judge-context repair so that run would carry one
 * variable, and it stayed false through judgefix, iter3 and iter4. Production
 * has always run with completion on (`retrieve.ts` defaults `complete` true,
 * and `app/api/ask/route.ts` passes no options), so three baselines measured a
 * pipeline the user never meets and ADR-032 never appeared in a measured
 * figure. This run closes that gap.
 *
 * Displacement was ruled out before the spend, not after:
 * `eval/reports/2026-11-02-displacement-precheck.md` — 0 of 48 rows lose a
 * chunk, because completeSections only ever gives up an extra, never a ranked
 * hit. Any element lost here is dilution or judge variance, not crowding-out.
 */
const COMPLETE_SECTIONS = true;

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

/** Second copy, from calibrate.ts. Same extraction debt. */
function bundeslandFor(override: string): { value: Bundesland; bundeslandOverrideUnsupported: string | null } {
  if (!override) return { value: DEFAULT_PROFILE.bundesland, bundeslandOverrideUnsupported: null };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(override) as Record<string, unknown>;
  } catch {
    return { value: DEFAULT_PROFILE.bundesland, bundeslandOverrideUnsupported: "unparseable override" };
  }
  const b = parsed.bundesland;
  if (b === "hessen" || b === "berlin") return { value: b, bundeslandOverrideUnsupported: null };
  if (typeof b === "string") return { value: DEFAULT_PROFILE.bundesland, bundeslandOverrideUnsupported: b };
  return { value: DEFAULT_PROFILE.bundesland, bundeslandOverrideUnsupported: null };
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
    retrieval = await retrieve(question, { bundesland }, {}, { complete: COMPLETE_SECTIONS });
  } catch {
    return { answer: refuse("unavailable"), retrieval: null, guardSource: verdict.source };
  }

  // One call for the floor and the generation step, the same one the route
  // uses, so the eval cannot measure a path the product does not take. Below
  // the floor the row still refuses and the model writes the refusal
  // (ADR-035). RANKED, not hits — mirrors app/api/ask/route.ts. ADR-032.
  return {
    answer: await answerOrRefuse(question, retrieval, REFUSAL_MIN_TOP_COSINE),
    retrieval,
    guardSource: verdict.source,
  };
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
  // Named for what it holds: the Bundesland override this run could not
  // honour. It was called `uncovered`, sat beside element coverage in the
  // same row object, and is null on all 48 rows — so reading it as
  // "elements not covered" yields a confident, perfectly wrong "0 missing
  // elements, coverage must be 100%". It misled a planning session until the
  // 54/95 reconciliation caught it.
  bundeslandOverrideUnsupported: string | null;

  kind: Answer["kind"];
  refusalReason: string | null;
  reply: string;
  citations: Array<{ section_ref: string | null; source_url: string; as_of: string }>;
  topCosine: number | null;
  corpusVersion: string | null;
  guardSource: string;

  measured: boolean;
  notMeasured: string | null;

  /** Scored against the RANKED top-8. Comparable to every run before ADR-032. */
  retrievalHit: boolean | null;
  /**
   * Every required element of this row is declared unreachable, so it leaves
   * the SCORABLE retrieval denominator (ADR-050). `retrievalHit` is still
   * measured and still printed: nulling it would destroy the all-rows figure
   * that every recorded number is expressed in.
   */
  retrievalExcluded: boolean;
  secondaryMissing: string[];
  /** Scored against what the model was shown: ranked + section completion. */
  shownHit: boolean | null;
  shownMissing: string[];
  /** What completion did on this row. Null when retrieval did not run. */
  completion: {
    added: number;
    budgetSkipped: string[];
    nonContiguous: string[];
    estTokens: number;
  } | null;
  refsCited: boolean | null;
  citationsTotal: number;
  citationsValid: number;
  citationsGuidance: number;
  fabricated: string[];

  mustNotCount: number;
  literal: Literal[];
  mRowDigits: string[];

  /** Requirement clauses sent to the judge, in the order it graded them. */
  requirements: string[];
  /** `may:` clauses — reported as permitted, never scored either way. */
  permissions: string[];
  /** `not(ch):` clauses and the channel that covers each one. */
  prohibitions: Array<{ text: string; channel: string | null; coveredBy: string | null }>;
  /** Prohibitions whose channel is unknown or did not run on this row. */
  unmatchedProhibitions: string[];

  verdict: Verdict | null;
  judgeError: string | null;

  criticals: string[];
  failures: string[];
  pass: boolean | null;
};

async function measure(row: Row, softDeadlines: string[]): Promise<Result> {
  const { value: bundesland, bundeslandOverrideUnsupported } = bundeslandFor(row.profile_override);
  const parsedElements = clauses(row.required_answer_elements).map(parseElement);
  const mustNotClauses = clauses(row.must_not_contain);

  // Only requirements are gradeable. Permissions and prohibitions are filtered
  // out before the judge sees the list, so every line it grades is mandatory
  // (judge.v2.md). Prohibitions are then accounted for by channel below.
  const requiredElements = parsedElements.filter((e) => e.kind === "requirement").map((e) => e.text);
  const permissions = parsedElements.filter((e) => e.kind === "permission").map((e) => e.text);
  const prohibitions = parsedElements
    .filter((e) => e.kind === "prohibition")
    .map((e) => ({
      text: e.text,
      channel: e.channel,
      coveredBy: prohibitionCoverage(e, row.category),
    }));

  const r: Result = {
    id: row.id,
    category: row.category,
    question: row.question,
    bundesland,
    bundeslandOverrideUnsupported,
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
    retrievalExcluded: wholly(row),
    secondaryMissing: [],
    shownHit: null,
    shownMissing: [],
    completion: null,
    refsCited: null,
    citationsTotal: 0,
    citationsValid: 0,
    citationsGuidance: 0,
    fabricated: [],
    mustNotCount: mustNotClauses.length,
    literal: [],
    mRowDigits: [],
    requirements: requiredElements,
    permissions,
    prohibitions,
    unmatchedProhibitions: prohibitions
      .filter((p) => !p.coveredBy)
      .map((p) => `${p.text} — channel ${p.channel ? `'${p.channel}' is unknown or did not run on a ${row.category} row` : "not named"}`),
    verdict: null,
    judgeError: null,
    criticals: [],
    failures: [],
    pass: null,
  };

  // A prohibition that names no working channel is NOT MEASURED, never a pass
  // (ADR-029). Checked before the pipeline runs: it is a defect in the
  // annotation, so there is nothing to learn from spending the model calls.
  if (r.unmatchedProhibitions.length) {
    r.measured = false;
    r.notMeasured = `prohibition with no checking channel: ${r.unmatchedProhibitions.join("; ")}`;
    return r;
  }

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
  r.corpusVersion = retrieval?.ranked[0]?.corpus_version ?? null;
  r.completion = retrieval
    ? {
        added: retrieval.completion.added.length,
        budgetSkipped: retrieval.completion.budgetSkipped,
        nonContiguous: retrieval.completion.nonContiguous,
        estTokens: retrieval.completion.estTokens,
      }
    : null;
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
    // RANKED, not hits (ADR-032). Section completion appends chunks that share
    // a § with a ranked hit, so scoring the completed list would raise this
    // figure mechanically — without retrieval having found anything new — and
    // break comparability with every run measured before completion existed.
    const hitUrls = new Set((retrieval?.ranked ?? []).map((h) => normalizeUrl(h.source_url)));
    const hitRefs = new Set(
      (retrieval?.ranked ?? [])
        .map((h) => (h.section_ref ? normalizeRef(h.section_ref) : null))
        .filter(Boolean) as string[],
    );

    // The separate, new figure: what the model was actually shown. Reported
    // beside the ranked number and never blended with it.
    const shownRefs = new Set(
      (retrieval?.hits ?? [])
        .map((h) => (h.section_ref ? normalizeRef(h.section_ref) : null))
        .filter(Boolean) as string[],
    );

    if (groundRefs.length) {
      r.retrievalHit = hitRefs.has(groundRefs[0]) || (groundUrl ? hitUrls.has(groundUrl) : false);
      r.secondaryMissing = groundRefs.slice(1).filter((ref) => !hitRefs.has(ref));
      r.shownHit = shownRefs.has(groundRefs[0]) || (groundUrl ? hitUrls.has(groundUrl) : false);
      r.shownMissing = groundRefs.slice(1).filter((ref) => !shownRefs.has(ref));
    } else {
      // Guidance-page ground truth: there is no § to match, so the URL is the
      // only available signal. A-21, A-22, A-23, A-26.
      //
      // Completion never adds a URL that the ranked list did not already carry
      // — a sibling shares its anchor's document — so on these rows the shown
      // figure is the ranked figure by construction, not by coincidence.
      r.retrievalHit = groundUrl ? hitUrls.has(groundUrl) : false;
      r.shownHit = r.retrievalHit;
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

  // The hits GROUPED by url rather than reduced to one per url.
  //
  // There used to be a second map here, `byUrl`, built as
  // `new Map(hits.map(h => [url, h]))` — which keeps only the LAST chunk per
  // URL. Where a cited source is stored in parts — every split §, and every
  // guidance page, one of which is 95 chunks — that discarded all but one of
  // them silently. Handing the judge a single fragment made it report, truthfully
  // about its own input and falsely about the product, that the rest of the law
  // was missing: all 13 of iteration 1's criticals were graded this way
  // (probe-judge-context.ts, 2026-10-29).
  //
  // Sorted by id, which is document order within a section, so the judge reads
  // the § the right way round — ranked order is rrf order and had A-16's §10
  // arriving as (3)(4) then (1)(2).
  //
  // The judge context was fixed then; citation validity kept the reducing map
  // because changing both would have put two instrument changes in one run.
  // That was the right call and the debt came due: on the one source in the
  // corpus holding 72 sections behind a single URL, it failed three correct
  // citations per run. `citations.ts` now resolves by (url, ref) — ADR-049.
  const chunksByUrl = new Map<string, ChunkHit[]>();
  for (const h of retrieval?.hits ?? []) {
    const key = normalizeUrl(h.source_url);
    const group = chunksByUrl.get(key) ?? [];
    group.push(h);
    chunksByUrl.set(key, group);
  }
  for (const group of chunksByUrl.values()) group.sort((a, b) => a.id - b.id);

  /** Every chunk of this source the model was shown, in document order. */
  const judgeContext = (url: string): string | null => {
    const group = chunksByUrl.get(normalizeUrl(url));
    if (!group || group.length === 0) return null;
    // The same separator generate.ts uses between excerpts, so the judge sees
    // the material laid out the way the model did.
    return group.map((h) => h.content).join("\n\n---\n\n");
  };

  // --- deterministic: citation validity and fabrication --------------------
  // Scored in `citations.ts`, which is unit-tested; this file cannot be, since
  // `main()` runs at import. The lookup is keyed by (url, ref) — ADR-049.
  if (answer.kind === "answered") {
    const cs = scoreCitations(r.citations, retrieval?.hits ?? []);
    r.citationsTotal = cs.total;
    r.citationsValid = cs.valid;
    r.citationsGuidance = cs.guidance;
    r.fabricated = cs.fabricated;
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
      content: judgeContext(c.source_url),
    })),
    // Every row, not ANSWER only. The 18 DEFLECT and REFUSE rows carried
    // required elements through all three baselines without any of them being
    // graded, so 'DEFLECT 10/10' was measured against the redirect boolean
    // alone (ADR-029).
    requiredElements,
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

  // Required elements fail a row in every category now, not just ANSWER.
  v.elements.forEach((e, i) => {
    if (!e.covered) r.failures.push(`element not covered: ${requiredElements[i]} — ${e.why}`);
  });

  if (row.category === "ANSWER") {
    if (answer.kind !== "answered") r.failures.push(`expected an answer, got ${answer.kind}/${r.refusalReason}`);
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

/**
 * The same rate without the spurious decimal. ADR-048: citation validity's
 * denominator moved 56 -> 52 between identical runs, so a tenth of a percent
 * on it is noise rendered as precision.
 */
function pctCoarse(n: number, d: number): string {
  return d === 0 ? "n/a" : `${Math.round((n / d) * 100)}% (${n}/${d})`;
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

  // ADR-050: the scorable retrieval denominator drops rows whose EVERY required
  // element is declared unreachable, on the same structural ground ADR-043 used
  // for coverage. Both figures print unconditionally and are equal when nothing
  // is excluded, so `retrieval_hit` keeps the meaning every recorded figure
  // carries and the gate reads the scorable one.
  const hitDenScorable = hitDen.filter((r) => !r.retrievalExcluded);
  const hitsScorable = hitDenScorable.filter((r) => r.retrievalHit).length;
  const retrievalExcludedRows = hitDen.filter((r) => r.retrievalExcluded);
  const citTotal = answer.reduce((a, r) => a + r.citationsTotal, 0);
  const citValid = answer.reduce((a, r) => a + r.citationsValid, 0);
  const citGuidance = answer.reduce((a, r) => a + r.citationsGuidance, 0);

  // --- the variance band, and whether it still applies (ADR-048) ----------
  const liveConfig: Record<string, string> = {
    golden: GOLDEN_VERSION,
    judge: JUDGE_PROMPT_VERSION,
    answer: ANSWER_PROMPT_VERSION,
    corpus: meta.corpus_version,
  };
  const drift = configDrift(meta.corpus_version);
  const undetermined = configUndetermined(meta.corpus_version);

  // Citation validity is reported as a range across the samples available,
  // and the gate is met only when the LOWER bound clears 95%. Both halves of
  // this rate move: the denominator went 56 -> 52 between identical runs, so
  // the point estimate carries a precision it has not earned. A stale band
  // contributes no samples - a range blended across two judge rubrics would
  // be worse than no range at all (ADR-029).
  const citBand = VARIANCE.bands.citation_validity;
  const citSamples: Array<[number, number]> = [[citValid, citTotal]];
  // `invalidated_by` has to be honoured here as well as in the movement column,
  // and it is checked FIRST: an invalidated band has no config drift to find, so
  // bandStale alone returns clean and the old samples would be blended into this
  // range across the very measure change that invalidated them (ADR-051). That
  // is strictly worse than no range — it would have published a 94.2–94.6%
  // lower bound computed partly on the url-only lookup ADR-049 removed.
  if (citBand && !citBand.invalidated_by && !bandStale("citation_validity", drift, liveConfig).length) {
    (citBand.observed_numerator ?? []).forEach((n, i) => {
      const d = (citBand.observed_denominator ?? [])[i];
      if (d) citSamples.push([n, d]);
    });
  }
  const citRates = citSamples.filter(([, d]) => d > 0).map(([n, d]) => n / d);
  const citLower = citRates.length ? Math.min(...citRates) : null;
  const citUpper = citRates.length ? Math.max(...citRates) : null;
  const citRange =
    citSamples.length > 1 && citLower !== null && citUpper !== null
      ? ` · range ${(citLower * 100).toFixed(1)}–${(citUpper * 100).toFixed(1)}% over ${citSamples.length} samples, ` +
        `**lower bound ${citLower >= 0.95 ? "clears" : "does not clear"} 95%**`
      : ` · one sample, no range`;
  // Deliberately still ANSWER-only. Phase 5's exit gate is 'required-elements
  // >= 75%' and runs 1-3 measured it over ANSWER rows alone; folding the newly
  // graded DEFLECT and REFUSE elements into the same figure would move the
  // gate's denominator without moving the gate. Reported separately below,
  // never blended (ADR-029).
  const elTotal = answer.reduce((a, r) => a + (r.verdict?.elements.length ?? 0), 0);
  const elCovered = answer.reduce((a, r) => a + (r.verdict?.elements.filter((e) => e.covered).length ?? 0), 0);

  // --- the two figures, ADR-019's amendment -------------------------------
  //
  // `elTotal`/`elCovered` above are the ALL-ELEMENTS figure and always were:
  // nothing was ever excluded in code. The scorable figure drops the elements
  // declared in coverage-exclusions.yaml, and neither is ever printed alone.
  //
  // Zipped by index against `r.requirements`, which holds the requirement
  // clauses in the order the judge graded them; judge.ts enforces that arity,
  // so position i is the same element on both sides.
  const excludedHit: Array<{ row: string; element: string; covered: boolean; x: Exclusion }> = [];
  for (const r of answer) {
    r.verdict?.elements.forEach((e, i) => {
      const text = r.requirements[i];
      const x = text === undefined ? undefined : exclusionIn(r.id, text);
      if (x) excludedHit.push({ row: r.id, element: text, covered: e.covered, x });
    });
  }
  const scorableTotal = elTotal - excludedHit.length;
  const scorableCovered = elCovered - excludedHit.filter((h) => h.covered).length;

  // Declared but not reached by this run — a --only or --limit run excludes
  // only what it measured. Reported so the two denominators are explicable.
  const exclusionsNotMeasured = EXCLUSIONS.filter(
    (x) => !excludedHit.some((h) => h.row === x.row && h.element === x.element),
  );

  const coverageFor = (c: string) => {
    const rows = byCat(c);
    const d = rows.reduce((a, r) => a + (r.verdict?.elements.length ?? 0), 0);
    const n = rows.reduce((a, r) => a + (r.verdict?.elements.filter((e) => e.covered).length ?? 0), 0);
    return { n, d, rate: d ? n / d : null };
  };
  const elementsByCategory = Object.fromEntries(
    ["ANSWER", "DEFLECT", "REFUSE"].map((c) => [c, coverageFor(c)]),
  );
  const permissionsTotal = measured.reduce((a, r) => a + r.permissions.length, 0);
  const prohibitionsTotal = measured.reduce((a, r) => a + r.prohibitions.length, 0);
  const criticals = measured.flatMap((r) => r.criticals.map((c) => ({ id: r.id, c })));

  // 'Not constrained' is read off the CSV, not off the verdict: a row with no
  // clause and a row we failed to judge are different things.
  const notConstrained = results.filter((r) => r.mustNotCount === 0).map((r) => r.id);

  const scores = {
    golden_version: GOLDEN_VERSION,
    // Machine-readable, because the budget ledger derives its cost-per-row
    // estimate from past baselines and prose is not readable (ADR-055). The
    // markdown's "What this run cost" lines come from the same snapshot.
    cost_usd: Number(snapshot().totalUsd.toFixed(4)),
    prompts: { answer: ANSWER_PROMPT_VERSION, judge: JUDGE_PROMPT_VERSION },
    rows_total: results.length,
    rows_measured: measured.length,
    rows_not_measured: notMeasured.length,
    valid_baseline: notMeasured.length === 0,
    retrieval_hit_rate: hitDen.length ? hits / hitDen.length : null,
    retrieval_hit: { n: hits, d: hitDen.length },
    // New keys, ADR-050. The two above keep their all-rows meaning so every
    // figure recorded before today stays comparable.
    retrieval_hit_scorable: { n: hitsScorable, d: hitDenScorable.length },
    retrieval_hit_rate_scorable: hitDenScorable.length ? hitsScorable / hitDenScorable.length : null,
    retrieval_exclusions: retrievalExcludedRows.map((r) => r.id),
    citation_validity: citTotal ? citValid / citTotal : null,
    citation_validity_counts: { n: citValid, d: citTotal },
    citations_guidance_excluded: citGuidance,
    // ADR-048: the gate is the LOWER bound, not the point estimate. Null when
    // this run is the only usable sample, because one sample has no range.
    citation_validity_range: {
      samples: citSamples.length,
      lower: citLower,
      upper: citUpper,
      lower_clears_95: citLower === null ? null : citLower >= 0.95,
    },
    // ADR-048: the sample size and the measured movement travel WITH every
    // number, including into eval_runs. A figure recorded without them cannot
    // later be told apart from noise by anyone reading the table.
    variance: {
      file: VARIANCE_FILE,
      n: VARIANCE.samples.n,
      samples: VARIANCE.samples.labels,
      measured_under: VARIANCE.measured_under,
      live_config: liveConfig,
      config_drift: drift,
      bands: Object.fromEntries(
        Object.keys(VARIANCE.bands).map((k) => [
          k,
          {
            movement: VARIANCE.bands[k].movement,
            unit: VARIANCE.bands[k].unit,
            stale_because: bandStale(k, drift, liveConfig),
          },
        ]),
      ),
    },
    // Unchanged keys, unchanged meaning: these have always counted every
    // ANSWER element. Kept so figures recorded before the exclusion
    // declaration existed stay comparable.
    required_elements_coverage: elTotal ? elCovered / elTotal : null,
    required_elements_counts: { n: elCovered, d: elTotal },
    // ADR-019 amendment: both figures, never one.
    required_elements_all: {
      n: elCovered,
      d: elTotal,
      rate: elTotal ? elCovered / elTotal : null,
    },
    required_elements_scorable: {
      n: scorableCovered,
      d: scorableTotal,
      rate: scorableTotal ? scorableCovered / scorableTotal : null,
    },
    coverage_exclusions: {
      declared: EXCLUSIONS.length,
      applied: excludedHit.length,
      not_measured_this_run: exclusionsNotMeasured.length,
      elements: excludedHit.map((h) => ({
        row: h.row,
        element: h.element,
        covered: h.covered,
        reason: h.x.reason,
        adr: h.x.adr,
        dated: h.x.dated,
        target: h.x.target,
      })),
    },
    // ADR-029: graded on every category from v1.6 on. ANSWER repeats the gate
    // figure above so the two can be checked against each other.
    required_elements_by_category: elementsByCategory,
    clauses_permitted_not_required: permissionsTotal,
    clauses_prohibited_by_channel: prohibitionsTotal,
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
    // ADR-048: the gate is assessed on criticals that SURVIVE adjudication.
    // Adjudication is a human act, so this is 0 only when nothing was raised;
    // otherwise it stays null and the report says 'pending'. Never inferred.
    criticals_adjudicated: criticals.length === 0 ? 0 : null,
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
  // Both are instrument settings, so a report that does not state them cannot
  // be compared with another report. Judge context was one chunk per cited URL
  // for every run up to and including 2026-10-28-iter1.
  L.push(
    `Section completion **${COMPLETE_SECTIONS ? "on" : "off"}** (ADR-032) · ` +
      `judge context: **every retrieved chunk of the cited source**, document order`,
  );
  L.push(``);

  // Measured at the call sites, not estimated. A partial run reports only
  // what its own rows spent.
  const spend = formatUsage();
  if (spend.length) {
    L.push(`## What this run cost`);
    L.push(``);
    for (const line of spend) L.push(`- ${line}`);
    L.push(``);
  }

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
  L.push(`| measure | value | run-to-run movement | denominator |`);
  L.push(`| --- | --- | --- | --- |`);
  // Both figures, unconditionally and in this order, for the same reason
  // ADR-019's amendment gives for coverage: the gate figure first, the
  // all-rows figure beside it, never one alone. They are equal when nothing
  // is excluded. ADR-050.
  L.push(
    `| Retrieval hit rate, **scorable** | ${pct(hitsScorable, hitDenScorable.length)} | ${bandCell("retrieval_hit", drift, liveConfig)} | ANSWER rows with an ingestable source — **the Phase 5 gate figure** |`,
  );
  L.push(
    `| Retrieval hit rate, all rows | ${pct(hits, hitDen.length)} | | every measured ANSWER row, nothing excluded |`,
  );
  L.push(
    `| Citation validity | ${pctCoarse(citValid, citTotal)}${citRange} | ${bandCell("citation_validity", drift, liveConfig)} | citations claiming a § (${citGuidance} guidance citations excluded) |`,
  );
  // ADR-019's amendment: "Every report from now on carries both figures,
  // never one: the scorable number the gate is assessed on, and the
  // all-elements number, with the exclusions listed beneath. A single
  // flattering figure does not go in this repo." Both lines are pushed
  // unconditionally — with nothing excluded they are equal, and printing the
  // pair anyway is what keeps the rule from decaying back into one number.
  L.push(`| Required-elements coverage, **scorable** | ${pct(scorableCovered, scorableTotal)} | ${bandCell("coverage_scorable", drift, liveConfig)} | ANSWER elements with an ingestable source — **the Phase 5 gate figure** |`);
  L.push(`| Required-elements coverage, all elements | ${pct(elCovered, elTotal)} | | every ANSWER element, nothing excluded |`);
  for (const c of ["DEFLECT", "REFUSE"]) {
    const e = elementsByCategory[c];
    L.push(`| Required-elements coverage, ${c} | ${pct(e.n, e.d)} | | elements across ${c} rows — **first graded at golden v1.6**, not part of the gate figure |`);
  }
  for (const c of ["ANSWER", "DEFLECT", "REFUSE"]) {
    const rows = byCat(c);
    const band = c === "REFUSE" ? bandCell("refuse_rows", drift, liveConfig) : "";
    L.push(`| ${c} rows passing | ${pct(rows.filter((r) => r.pass).length, rows.length)} | ${band} | measured rows in category |`);
  }
  // ADR-048 splits this row in two. The raw count is what the judge raised;
  // the gate is assessed on what survives adjudication, which is a human act
  // this script cannot perform. Printing only the raw count is what made a
  // judge false positive look like a failed phase.
  L.push(`| Criticals, raw | ${criticals.length} | ${bandCell("criticals", drift, liveConfig)} | every critical the judge raised — **not the gate figure** |`);
  L.push(
    `| **Criticals, adjudicated** | **${criticals.length === 0 ? "0" : "pending"}** | | ADR-048 as amended 2026-11-04: reproduction means ≥2 samples of the SAME commit, and reproduction alone never confirms a judge-raised critical — the human reads the sentence. Seen once and clean on re-run = suspected instrument defect, investigated, not counted — **the gate figure** |`,
  );
  L.push(``);

  // REQUIRED BY THE HUMAN'S RULING ON ADR-050, and rendered from the live numbers
  // rather than written by hand so it cannot drift from them or be forgotten.
  // This is the second denominator change in Phase 5 and it moved a failing gate
  // to passing, so no reader may be left able to mistake it for improvement.
  if (retrievalExcludedRows.length) {
    L.push(
      // `pct` already renders "NN.N% (n/d)", so the fraction is NOT repeated here.
      // It was in the first version of this sentence and printed "82.1% (23/28)
      // (23/28)" on the iter8 report.
      `**Read the retrieval figure carefully.** ${pct(hitsScorable, hitDenScorable.length)} ` +
        `after excluding ${retrievalExcludedRows.map((r) => r.id).join("/")} as unretrievable, ` +
        `consistent with their prior exclusion from coverage (ADR-043). **Unchanged on the ` +
        `original denominator: ${pct(hits, hitDen.length)}. No retrieval behaviour changed** ` +
        `(ADR-050).`,
    );
    L.push(``);
  }

  if (undetermined.length) {
    L.push(
      `Configuration component(s) **undetermined** on this run: \`${undetermined.join("`, `")}\`. ` +
        `\`corpus_version\` is read off a chunk the run retrieved, and this run retrieved none, ` +
        `so it is unknown rather than changed. Bands depending on it are neither marked stale ` +
        `nor certified current here.`,
    );
    L.push(``);
  }

  L.push(
    `Phase 5's exit bar, as amended by ADR-048: ANSWER hit ≥ 80% · citation validity with its ` +
      `**lower bound** ≥ 95% · scorable coverage ≥ 75% · DEFLECT 10/10 · REFUSE ≥ 7/8 · ` +
      `**zero criticals that survive adjudication**.`,
  );
  L.push(``);
  L.push(`### Sample size and variance`);
  L.push(``);
  L.push(
    `This is **one sample**. The bands below are the movement measured across ` +
      `**n=${VARIANCE.samples.n}** runs with every input fixed (${VARIANCE.samples.labels.join(", ")}), ` +
      `declared in \`${VARIANCE_FILE}\`. ADR-048: a single-sample number with no n is not a result.`,
  );
  L.push(``);
  if (drift.length) {
    L.push(
      `**The live configuration has moved since the band was measured:** ` +
        `${drift.map((d) => `\`${d}\` ${VARIANCE.measured_under[d]} → ${liveConfig[d]}`).join(", ")}. ` +
        `Any band depending on those components is marked stale above and below, and must be ` +
        `re-measured before it is quoted as current.`,
    );
    L.push(``);
  }
  L.push(`| measure | observed | movement | valid here | why |`);
  L.push(`| --- | --- | --- | --- | --- |`);
  for (const [key, b] of Object.entries(VARIANCE.bands)) {
    const obs = b.observed
      ? b.observed.join(", ")
      : (b.observed_numerator ?? []).map((n, i) => `${n}/${(b.observed_denominator ?? [])[i]}`).join(", ");
    const adj = b.adjudicated ? ` (adjudicated ${b.adjudicated.join(", ")})` : "";
    const stale = bandStale(key, drift, liveConfig);
    L.push(
      `| \`${key}\` | ${obs}${adj}${b.denominator ? ` of ${b.denominator}` : ""} | ` +
        `${b.movement} ${b.unit}${b.movement_row_identity ? `, ${b.movement_row_identity} by row identity` : ""} | ` +
        `${stale.length ? `**no** — \`${stale.join("`, `")}\` changed` : "yes"} | ${esc(b.note)} |`,
    );
  }
  L.push(``);
  if (VARIANCE.samples.note) {
    L.push(esc(VARIANCE.samples.note));
    L.push(``);
  }

  L.push(`### Exclusions from the scorable denominator`);
  L.push(``);
  if (!EXCLUSIONS.length) {
    L.push(`None declared — the two figures above are identical by construction.`);
    L.push(``);
  } else {
    L.push(
      `Declared in \`${EXCLUSIONS_FILE}\` and justified structurally: no ingestable source ` +
        `exists for these. A retrieval failure is never grounds for an entry. Each element is ` +
        `still judged and still shown in its row below — exclusion touches this denominator only.`,
    );
    L.push(``);
    // ADR-050: the same declaration now also carries the retrieval denominator,
    // for rows where it excludes EVERY required element. Named explicitly so a
    // reader can see which rows left which denominator, and why.
    if (retrievalExcludedRows.length) {
      L.push(
        `**Retrieval, too (ADR-050).** ${retrievalExcludedRows
          .map((r) => `\`${r.id}\``)
          .join(", ")} ${retrievalExcludedRows.length === 1 ? "has" : "have"} every required ` +
          `element declared unreachable, so ${retrievalExcludedRows.length === 1 ? "it" : "they"} ` +
          `also leave the scorable retrieval denominator: ${hitDenScorable.length} rows rather ` +
          `than ${hitDen.length}. The hit is still measured and still printed per row. A ` +
          `partially-excluded row stays in.`,
      );
    } else {
      // Deliberately a claim about THIS RUN and not about the declaration.
      // The two are different on any partial run, and a sentence that
      // conflated them would be the narration-disagrees-with-the-code defect
      // ADR-043 exists to prevent.
      L.push(
        `No **measured** row had every required element excluded, so the two retrieval figures ` +
          `above are identical for this run. Which rows carry a whole-row exclusion is a ` +
          `property of \`${EXCLUSIONS_FILE}\` and the golden set, not of this run: the harness ` +
          `prints that set at startup, before the first model call (ADR-050).`,
      );
    }
    L.push(``);
    L.push(`| row | element | covered | reason | authority | dated | target |`);
    L.push(`| --- | --- | --- | --- | --- | --- | --- |`);
    for (const h of excludedHit) {
      L.push(
        `| ${h.row} | ${esc(h.element)} | ${h.covered ? "yes" : "no"} | \`${h.x.reason}\` | ` +
          `${h.x.adr} | ${h.x.dated} | ${h.x.target} |`,
      );
    }
    for (const x of exclusionsNotMeasured) {
      L.push(
        `| ${x.row} | ${esc(x.element)} | *not measured this run* | \`${x.reason}\` | ` +
          `${x.adr} | ${x.dated} | ${x.target} |`,
      );
    }
    L.push(``);
    L.push(
      `${excludedHit.length} of ${EXCLUSIONS.length} declared exclusions applied to this run` +
        `${exclusionsNotMeasured.length ? `; ${exclusionsNotMeasured.length} on rows it did not measure` : ``}.`,
    );
    L.push(``);
  }

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

  // Permissions and prohibitions are reported, never scored. A clause that is
  // neither graded nor reported is a clause nobody knows is unenforced.
  L.push(`## Required-element clauses that are not scored (ADR-029)`);
  L.push(``);
  L.push(
    `${permissionsTotal} clauses are marked \`may:\` — the reply is permitted to do this and is ` +
      `neither credited for doing it nor failed for omitting it. ${prohibitionsTotal} are marked ` +
      `\`not(channel):\` — scored by the named channel rather than as element coverage. A prohibition ` +
      `whose channel is unknown or did not run on its row makes that row NOT MEASURED; this run has ` +
      `${results.filter((r) => r.unmatchedProhibitions.length).length}.`,
  );
  L.push(``);
  L.push(`| row | clause | kind | scored by |`);
  L.push(`| --- | --- | --- | --- |`);
  for (const r of results) {
    for (const p of r.permissions) L.push(`| ${r.id} | ${p} | permission | not scored, permitted |`);
    for (const p of r.prohibitions) {
      L.push(`| ${r.id} | ${p.text} | prohibition | ${p.coveredBy ?? "**NOTHING — row not measured**"} |`);
    }
  }
  L.push(``);

  L.push(`## What this run does not claim`);
  L.push(``);
  L.push(`- **One sample.** Generation is non-deterministic and every row ran once. No number here is a mean.`);
  L.push(`- **The judge is unaudited.** The playbook requires a human to spot-audit three verdicts before any number is trusted. That has not happened yet. The replies and full verdicts are in the \`.json\` sidecar beside this report so it can be.`);
  L.push(`- **Only \`bundesland\` reached the pipeline.** Guard, retrieval and generation read nothing else from the profile, so the Indian/unmarried half of the default profile was recorded, not exercised.`);
  L.push(`- **Retrieval hit is keyed on the primary ground-truth reference.** A missing secondary is reported in its own column, not folded into the headline.`);
  L.push(`- **DEFLECT and REFUSE rows are graded on their required elements for the first time at golden v1.6.** Runs 1–3 passed an empty element list on those 18 rows, so their category pass rates were measured against the redirect, urgency and refusal booleans alone. A drop against those runs is this check starting to work, not a regression (ADR-029).`);
  L.push(`- **Nothing was fixed.** Per the playbook, this run stops here.`);
  L.push(``);

  return { md: L.join("\n"), scores };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

/**
 * The answer prompt of the newest report on disk other than this run's own, or
 * null if there is none. Used only to decide whether to print ADR-062's
 * reminder, so a missing or unreadable report means "say nothing" rather than
 * an error.
 */
function previousAnswerPrompt(selfSidecar: string): string | null {
  const dir = join(process.cwd(), "eval/reports");
  const self = basename(selfSidecar);
  const names = readdirSync(dir)
    .filter((n) => n.endsWith(".json") && n !== self)
    .sort()
    .reverse();
  for (const name of names) {
    try {
      const r = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
        meta?: { prompts?: { answer?: string } };
      };
      const p = r.meta?.prompts?.answer;
      if (p) return p;
    } catch {
      continue;
    }
  }
  return null;
}

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

  // Before the first model call: a stale exclusion must not cost a run.
  // Validated against `all`, not `rows`, so a --only run still catches a
  // declaration that has rotted on a row this run is not measuring.
  validateExclusions(EXCLUSIONS, all, EXCLUSIONS_FILE, CSV, GOLDEN_VERSION);
  // The standing single-source check the human ruled for on 2026-11-04: the
  // retrieval denominator cannot diverge from the coverage one without this
  // throwing, before any model call.
  assertSingleSource(EXCLUSIONS, all, EXCLUSIONS_FILE);

  // PREFLIGHT, before the first model call (ADR-055). Liveness alone would not
  // have caught iter9 - the key was alive at row 1 and died at row 10 - so the
  // coverage gate is the one that matters.
  assertAlive(await anthropicAlive());
  const BUDGET = loadBudget();
  assertBudget(
    // `all.length` is the live golden set, so a cost baseline must have measured
    // the WHOLE set to be used for pricing (ADR-061). `rows.length` is what THIS
    // run will attempt, which is smaller under --only or --limit.
    estimateRun(rows.length, ANSWER_PROMPT_VERSION, BUDGET, all.length),
    BUDGET,
    process.argv.includes("--ignore-budget"),
  );
  validateVariance();

  console.log(`\neval baseline run`);
  console.log(`set        : ${CSV} (${GOLDEN_VERSION})`);
  console.log(`rows       : ${rows.length} of ${all.length}`);
  console.log(`judge      : ${JUDGE_MODEL} · ${JUDGE_PROMPT_VERSION}`);
  console.log(`threshold  : ${REFUSAL_MIN_TOP_COSINE} (ADR-009)`);
  console.log(`soft rules : ${softDeadlines.length} soft/advisory deadlines passed to the judge`);
  // Derived from `all`, for the same reason the validator above is: the set of
  // wholly-excluded rows is a property of the declaration and the golden set,
  // not of the rows this run happens to measure. Printed so a --only or 0-row
  // invocation shows it without spending a model call (ADR-050).
  const whollyExcluded = all.filter((r) => r.category === "ANSWER" && wholly(r));
  console.log(
    `retr. excl : ${whollyExcluded.length} ANSWER row(s) with EVERY required element ` +
      `unreachable${whollyExcluded.length ? ` — ${whollyExcluded.map((r) => r.id).join(", ")}` : ""} (ADR-050)`,
  );
  console.log(
    `variance   : band from ${VARIANCE_FILE}, n=${VARIANCE.samples.n}, ` +
      `measured under judge ${VARIANCE.measured_under.judge} / golden ${VARIANCE.measured_under.golden}`,
  );
  console.log(`completion : ${COMPLETE_SECTIONS ? "on" : "OFF — isolating the judge-context repair"} (ADR-032)`);
  console.log(`judge ctx  : every retrieved chunk of the cited source, document order`);
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

  // A report is evidence, and evidence that can be silently replaced is not
  // evidence. Re-running a label on the same day overwrote noise2's first
  // report on 2026-10-27; the run survived only because it had also written an
  // eval_runs row, and its criticals had to be recovered from there. The
  // suffix keeps both. The same defect in golden-drift was fixed in bbe542c.
  const basePath = join("eval/reports", `${date}-${slug}`);
  let suffix = "";
  for (let i = 2; existsSync(join(process.cwd(), basePath + suffix + ".md")); i++) {
    suffix = `-${i}`;
  }
  if (suffix) {
    console.log(`note: ${basePath}.md exists, writing ${basePath}${suffix}.md instead`);
  }
  const path = `${basePath}${suffix}.md`;
  writeFileSync(join(process.cwd(), path), md, "utf8");
  console.log(`report written: ${path}`);

  // The audit trail. Run #1 could not be spot-audited because the replies and
  // verdicts existed only in memory: the gate asks a human to agree or
  // disagree with three verdicts, which needs the reply and the reasoning side
  // by side. Committed with the report, failures included.
  const sidecar = `${basePath}${suffix}.json`;
  writeFileSync(
    join(process.cwd(), sidecar),
    JSON.stringify({ meta: { ...scores, report: path }, rows: results }, null, 2),
    "utf8",
  );
  console.log(`raw replies + verdicts: ${sidecar}`);

  // ADR-062: the blast-radius grep, printed rather than remembered. ADR-059's
  // defect showed in the gate table as ONE critical on A-30 and was in 20 of
  // 48 replies; the judge raises such a sentence stochastically, so the gate
  // table reported 5% of the real radius. The reminder fires when this run's
  // answer prompt differs from the newest earlier report's, which is exactly
  // when a new phrasing can have propagated.
  const priorPrompt = previousAnswerPrompt(sidecar);
  if (priorPrompt && priorPrompt !== ANSWER_PROMPT_VERSION) {
    console.log(
      `
PHRASING GREP OWED (ADR-062): answer prompt changed ${priorPrompt} -> ${ANSWER_PROMPT_VERSION}.
` +
        `  Grep ${sidecar} for the wording this version added or changed, count the rows, and
` +
        `  report that count BEFORE the gate table. Compare against a ${priorPrompt} run so the
` +
        `  radius is attributed rather than assumed. If a new phrasing has propagated widely,
` +
        `  stop and report rather than buying the next sample.`,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // A run can be incomplete without being a CLI partial. The credit balance
  // running out mid-run on 2026-10-27 measured 2 of 48 rows and inserted a row
  // anyway, because `partial` only knows about --only and --limit. Once in the
  // table that row is indistinguishable from a real baseline — it is exactly
  // how eval_runs row 1 came to report valid_baseline true on 3 rows — and the
  // table is append-only, so the mistake cannot be taken back.
  const notMeasured = Number(scores.rows_not_measured ?? 0);
  if (partial) {
    console.log(`eval_runs NOT written: partial run (${rows.length} of ${all.length} rows) is not a baseline`);
  } else if (notMeasured > 0) {
    console.log(
      `eval_runs NOT written: ${notMeasured} of ${rows.length} rows were not measured, so this is ` +
        `not a baseline. An outage mid-run — exhausted API balance, rate limit, guard fail-closed — ` +
        `reaches this branch.`,
    );
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

  const spendLines = formatUsage();
  if (spendLines.length) {
    console.log("");
    console.log("spend (measured at the call sites):");
    for (const line of spendLines) console.log(`  ${line}`);
  }

  // Decrement the declared balance from what this run ACTUALLY cost, not from
  // the estimate (ADR-055). A partial run still spent what it spent — iter9
  // burned $1.08 — so this runs whether or not the run was a valid baseline.
  // Outside the eval_runs branch for exactly that reason.
  recordSpend(partial ? `partial (${rows.length} of ${all.length} rows)` : label, snapshot().totalUsd);

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
