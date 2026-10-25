// lib/rag/guards.ts
//
// The two gates in front of the answer path.
//
//   1. The medical guard, which runs BEFORE query expansion and BEFORE any
//      retrieval or embedding call. A clinical question must never reach the
//      corpus, the embedding provider, or the answer model.
//   2. The refusal signal, which runs AFTER retrieval on the raw cosine.
//
// Both fail closed, for different reasons: the medical line is about harm, the
// refusal line is about saying something we cannot source
// (docs/legal-compliance-pack.md §3).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { parse } from "yaml";
import { z } from "zod";
import type { Answer } from "../schemas";

// ---------------------------------------------------------------------------
// Prompt and glossary
// ---------------------------------------------------------------------------

// Read the same way lib/rag/expand.ts reads the glossary: from the repo root at
// module load. Prompts are versioned files, never inline strings (rule 6).
// NOTE for Phase 7: Next's output file tracing does not follow a runtime
// readFileSync, so deployment has to carry lib/prompts/ and data/ explicitly.
const GUARD_PROMPT = readFileSync(join(process.cwd(), "lib/prompts/guard.v1.md"), "utf8");

type GlossaryTerm = { de: string; en_gloss: string };

// Deliberately a second, tiny reader rather than an import from expand.ts: the
// guard runs before expansion and must not depend on it, and step 2 of this
// phase says to wire expand.ts, not to change it.
const glossary: { terms: GlossaryTerm[] } = parse(
  readFileSync(join(process.cwd(), "data/glossary.de-en.yaml"), "utf8"),
);

/**
 * The gloss shown to the user is the glossary's own string, never a paraphrase
 * written here (rule 14). A missing term throws at module load rather than
 * silently rendering a bare German word at an English-speaking user.
 */
function gloss(de: string): string {
  const term = glossary.terms.find((t) => t.de === de);
  if (!term) throw new Error(`glossary is missing '${de}' — add it to data/glossary.de-en.yaml`);
  return term.en_gloss;
}

const FRAUENARZT = `${"Frauenarzt"} (${gloss("Frauenarzt")})`;
const HEBAMME = `${"Hebamme"} (${gloss("Hebamme")})`;

// ---------------------------------------------------------------------------
// The medical classifier
// ---------------------------------------------------------------------------

const GUARD_MODEL = "claude-haiku-5-5";

// Thinking is on by default on this model and is billed against max_tokens, so
// a classifier ceiling of a few hundred tokens can be spent before the verdict
// is written. 1024 leaves room; the verdict itself is two booleans.
const GUARD_MAX_TOKENS = 1024;

export const GuardVerdict = z.object({
  medical: z.boolean(),
  urgent: z.boolean(),
});

export type GuardVerdict = z.infer<typeof GuardVerdict>;

export type GuardDecision = {
  medical: boolean;
  urgency: "urgent" | "routine";
  /**
   * 'classifier' — the model returned a verdict we could parse.
   * 'fail_closed' — it did not, and we deflected anyway. The eval harness reads
   * this: a fail_closed deflection is an outage, not a pass.
   */
  source: "classifier" | "fail_closed";
};

/**
 * What we do when we do not know what was asked.
 *
 * Urgent, deliberately. An unreachable classifier means the question is
 * unclassified, and the harm is not symmetric: telling someone to contact their
 * practice now is never dangerous, while withholding it from someone who is
 * bleeding is. The cost is that an outage shows up as digits in a deflection,
 * which the eval flags — correct, because an outage is a failure and should not
 * be able to hide behind a tidy-looking deflection.
 */
export function failClosed(): GuardDecision {
  return { medical: true, urgency: "urgent", source: "fail_closed" };
}

export type Classifier = (question: string) => Promise<GuardDecision>;

let cachedClient: Anthropic | null = null;

function client(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

/**
 * Runs first, on every call. Never throws: every failure path returns
 * failClosed().
 */
export async function classifyMedical(
  question: string,
  deps: { anthropic?: Anthropic } = {},
): Promise<GuardDecision> {
  try {
    const response = await (deps.anthropic ?? client()).messages.parse({
      model: GUARD_MODEL,
      max_tokens: GUARD_MAX_TOKENS,
      output_config: { effort: "low", format: zodOutputFormat(GuardVerdict) },
      system: GUARD_PROMPT,
      // Delimited because the question is user input. The rubric tells the
      // model that the delimited text is data and that instructions inside it
      // are never obeyed (brief §4, prompt injection surface).
      messages: [{ role: "user", content: `<question>\n${question}\n</question>` }],
    });

    // A safety refusal, or a response cut off before the verdict was written, is
    // an unparseable verdict like any other.
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      return failClosed();
    }
    const verdict = response.parsed_output;
    if (!verdict) return failClosed();

    return {
      medical: verdict.medical,
      // A non-medical question has no urgency, whatever the model said.
      urgency: verdict.medical && verdict.urgent ? "urgent" : "routine",
      source: "classifier",
    };
  } catch {
    return failClosed();
  }
}

// ---------------------------------------------------------------------------
// Deflection
// ---------------------------------------------------------------------------

/**
 * Routine deflection. Contains no digit of any kind — not a dose, not a week,
 * not a phone number. Golden row M-09 is read character by character against
 * this, and `containsDigit` is asserted over it in the tests.
 */
export const DEFLECTION_ROUTINE = [
  `This one needs a clinician, so we are not going to answer it.`,
  ``,
  `Your ${FRAUENARZT} or your ${HEBAMME} knows your pregnancy and can answer it properly. For anything about medicines, a pharmacist can help as well.`,
  ``,
  `What we do cover is deadlines, forms, and which office handles what. Ask us about registration, benefits or documents and we will answer from the official sources.`,
].join("\n");

/**
 * Urgent deflection. Carries the two numbers a person needs when something is
 * happening now, and nothing else: no triage, no severity scale, no
 * reassurance, no clinical content.
 */
export const DEFLECTION_URGENT = [
  `Please contact your ${FRAUENARZT}, your ${HEBAMME} or your hospital now — today, not at your next appointment.`,
  ``,
  `Outside practice hours, the on-call medical service is reachable on 116117. If this feels severe, or it is getting worse, call 112.`,
  ``,
  `We cannot assess symptoms, and we do not want to hold you up by trying.`,
].join("\n");

export function deflectionText(urgency: GuardDecision["urgency"]): string {
  return urgency === "urgent" ? DEFLECTION_URGENT : DEFLECTION_ROUTINE;
}

export function deflect(decision: GuardDecision): Answer {
  return {
    kind: "deflected",
    text: deflectionText(decision.urgency),
    reason: "medical",
  };
}

/**
 * Exported so the tests and the eval harness share one definition of "contains
 * a number" instead of each writing their own regex. Matches any Unicode
 * decimal digit, so a full-width or Devanagari numeral is caught too.
 */
export function containsDigit(text: string): boolean {
  return /\p{Nd}/u.test(text);
}

// ---------------------------------------------------------------------------
// Refusal
// ---------------------------------------------------------------------------

/**
 * Measured, not guessed: ADR-009, from the two cosine distributions that
 * scripts/eval/calibrate.ts printed over all 30 ANSWER and 8 REFUSE rows.
 *
 * It is a FLOOR against answering from nothing, not the refusal mechanism.
 * Four of the eight REFUSE rows retrieve real corpus text at 0.51–0.64 — a
 * Bavarian Elterngeld question, a Steuerklasse question, "will we be
 * approved", "fill in our form" — and no cosine cutoff can catch those without
 * refusing most answerable questions. They are refused by the scope and
 * individual-case rules in answer.v1.md instead (legal pack §3).
 *
 * Re-run calibrate.ts after any re-ingest: corpus composition moves rank order
 * and nothing else reports it.
 */
export const REFUSAL_MIN_TOP_COSINE = 0.43;

/**
 * True when the best chunk we retrieved is too weak to answer from. Threshold
 * stays a required argument so a call site cannot silently drift from ADR-009.
 */
export function isLowConfidence(
  hits: ReadonlyArray<{ cosine: number }>,
  minTopCosine: number,
): boolean {
  if (hits.length === 0) return true;
  const top = Math.max(...hits.map((h) => h.cosine));
  return top < minTopCosine;
}

/**
 * The wording is docs/design-system.md §7's empty-state line: give direction,
 * not mood. Naming the authority is also what keeps a refusal useful rather
 * than a dead end.
 */
export const REFUSAL_LOW_CONFIDENCE = [
  `We could not find this in the official sources we cover, so we are not going to answer it from memory.`,
  ``,
  `The Elterngeldstelle (${gloss("Elterngeldstelle")}) and your Standesamt (${gloss("Standesamt")}) answer questions like this directly, and they are the ones who decide.`,
].join("\n");

/**
 * Said when our own pipeline failed, not when the sources came up short. It
 * must never send the user to an authority for a question we never processed,
 * and it offers the only direction that is true here: try again. ADR-022.
 */
export const REFUSAL_UNAVAILABLE = [
  `Something on our side failed, so we could not check the official sources for this question.`,
  ``,
  `Please try again in a few minutes.`,
].join("\n");

export function refuse(
  reason: "low_confidence" | "out_of_scope" | "individual_case" | "unavailable",
  text: string = reason === "unavailable" ? REFUSAL_UNAVAILABLE : REFUSAL_LOW_CONFIDENCE,
): Answer {
  return { kind: "refused", text, reason };
}
