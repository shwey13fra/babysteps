// scripts/eval/judge.ts
//
// LLM-as-judge for the eval harness. One call per golden row, on a small model.
//
// Two properties matter more than anything else here:
//
//   1. It FAILS CLOSED TO 'not measured', never to 'pass'. A judge that returns
//      a pass when the provider times out manufactures a clean baseline out of
//      an outage. Same reasoning as ADR-022 one layer up.
//   2. The arrays it returns are matched back to the supplied lists BY
//      POSITION, so a verdict with the wrong arity is rejected rather than
//      silently misaligned. A must_not clause graded against the wrong clause
//      is worse than an ungraded one.
//
// The rubric is lib/prompts/judge.v1.md (rule 6: prompts are versioned files).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const JUDGE_MODEL = "claude-haiku-5-5";
export const JUDGE_PROMPT_VERSION = "judge.v1.md";

const JUDGE_PROMPT = readFileSync(join(process.cwd(), "lib/prompts", JUDGE_PROMPT_VERSION), "utf8");
const JUDGE_MAX_TOKENS = 4096;

const Verdict = z.object({
  elements: z.array(
    z.object({
      element: z.string(),
      covered: z.boolean(),
      why: z.string(),
    }),
  ),
  must_not: z.array(
    z.object({
      clause: z.string(),
      violated: z.boolean(),
      quote: z.string(),
    }),
  ),
  clinical_content: z.boolean().nullable(),
  redirect_present: z.boolean().nullable(),
  urgency_present: z.boolean().nullable(),
  refusal_present: z.boolean().nullable(),
  invented_claim: z.boolean().nullable(),
  uncited_legal_claim: z.boolean().nullable(),
  soft_deadline_as_statutory: z.boolean().nullable(),
  individual_case_verdict: z.boolean().nullable(),
  authority_named: z.boolean().nullable(),
});

export type Verdict = z.infer<typeof Verdict>;

export type JudgeInput = {
  id: string;
  category: string;
  question: string;
  reply: string;
  citations: Array<{ section_ref: string | null; source_url: string; as_of: string }>;
  requiredElements: string[];
  mustNotClauses: string[];
  softDeadlines: string[];
};

/** Either a verdict, or the reason there is none. Never a default pass. */
export type JudgeResult =
  | { ok: true; verdict: Verdict }
  | { ok: false; error: string };

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (!cached) cached = new Anthropic();
  return cached;
}

function userContent(input: JudgeInput): string {
  const lines = [
    `category: ${input.category}`,
    ``,
    `<question>`,
    input.question,
    `</question>`,
    ``,
    `<reply>`,
    input.reply,
    `</reply>`,
    ``,
  ];

  if (input.citations.length) {
    lines.push(`<citations>`);
    for (const c of input.citations) {
      lines.push(`- ${c.section_ref ?? "(no section ref)"} — ${c.source_url} — as of ${c.as_of}`);
    }
    lines.push(`</citations>`, ``);
  } else {
    lines.push(`<citations>none</citations>`, ``);
  }

  // Numbered so a misaligned array is visible in the raw verdict, not just in
  // the arity check below.
  lines.push(`<required_elements>`);
  input.requiredElements.forEach((e, i) => lines.push(`${i + 1}. ${e}`));
  if (!input.requiredElements.length) lines.push(`(none supplied)`);
  lines.push(`</required_elements>`, ``);

  lines.push(`<must_not_clauses>`);
  input.mustNotClauses.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  if (!input.mustNotClauses.length) lines.push(`(none supplied)`);
  lines.push(`</must_not_clauses>`, ``);

  lines.push(`<soft_deadlines>`);
  for (const d of input.softDeadlines) lines.push(`- ${d}`);
  lines.push(`</soft_deadlines>`);

  return lines.join("\n");
}

export async function judge(
  input: JudgeInput,
  deps: { anthropic?: Anthropic } = {},
): Promise<JudgeResult> {
  try {
    const response = await (deps.anthropic ?? client()).messages.parse({
      model: JUDGE_MODEL,
      max_tokens: JUDGE_MAX_TOKENS,
      output_config: { effort: "medium", format: zodOutputFormat(Verdict) },
      system: JUDGE_PROMPT,
      messages: [{ role: "user", content: userContent(input) }],
    });

    if (response.stop_reason === "refusal") return { ok: false, error: "judge refused" };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "judge hit max_tokens" };
    if (!response.parsed_output) return { ok: false, error: "judge returned no parsed output" };

    const v = response.parsed_output;

    // Position is the only thing tying a verdict entry to the criterion it was
    // supposed to grade. Wrong arity means the mapping is unknown, so the row
    // is not measured rather than measured wrongly.
    if (v.elements.length !== input.requiredElements.length) {
      return {
        ok: false,
        error: `element arity ${v.elements.length} != ${input.requiredElements.length} supplied`,
      };
    }
    if (v.must_not.length !== input.mustNotClauses.length) {
      return {
        ok: false,
        error: `must_not arity ${v.must_not.length} != ${input.mustNotClauses.length} supplied`,
      };
    }

    return { ok: true, verdict: v };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}
