// lib/rag/generate.ts
//
// Guard -> expand -> retrieve -> **generate**.
//
// The model writes prose and chooses which excerpts it used. It does not supply
// dates, and it cannot introduce a source: every citation is matched back to a
// chunk that retrieval actually returned, and `as_of` is read from that chunk's
// record. A citation the model invented has no matching chunk and is dropped,
// which turns a fabricated source into an empty citation list, which the Answer
// contract rejects (rule 8).
//
// Fails closed: a contract violation is retried once, then becomes a refusal.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { Answer, type Citation, type Jurisdiction } from "../schemas";
import { refuse } from "./guards";
import type { Retrieval } from "./retrieve";
import { record } from "./usage";

const ANSWER_PROMPT = readFileSync(join(process.cwd(), "lib/prompts/answer.v2.md"), "utf8");

const ANSWER_MODEL = "claude-opus-5-5";
const ANSWER_MAX_TOKENS = 4096;

/**
 * What the model is asked for. Deliberately NOT the Answer contract:
 *
 *   - no `as_of`, because a date the model writes is a date nobody checked
 *     (the spirit of rule 4);
 *   - no `doc_title`, same reason;
 *   - flat rather than a discriminated union, because the structured-output
 *     schema stays simple and the real contract is applied afterwards.
 */
export const Generated = z.object({
  kind: z.enum(["answered", "refused"]),
  text: z.string(),
  citations: z.array(z.object({ section_ref: z.string(), source_url: z.string() })),
  jurisdiction_scope: z.string(),
  glossed_terms: z.array(z.object({ de: z.string(), en_gloss: z.string() })),
  refusal_reason: z.enum(["none", "low_confidence", "out_of_scope", "individual_case"]),
});

export type Generated = z.infer<typeof Generated>;

export function describeScope(jurisdictions: Jurisdiction[]): string {
  const state = jurisdictions.includes("hesse") ? "Hessen" : "Berlin";
  return `federal German law, the ${state} state procedures, and the Indian consular track`;
}

function renderExcerpts(retrieval: Retrieval): string {
  if (retrieval.hits.length === 0) return "(no excerpts were retrieved)";
  return retrieval.hits
    .map((h, i) => {
      const label = h.section_ref || h.doc_title || "(untitled)";
      return [
        `[${i + 1}] ${label}${h.doc_title && h.section_ref ? ` — ${h.doc_title}` : ""}`,
        `source_url: ${h.source_url}`,
        h.content.trim(),
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function renderGlossary(retrieval: Retrieval): string {
  if (retrieval.expansion.matched.length === 0) return "(no glossary terms were detected)";
  return retrieval.expansion.matched.map((m) => `${m.de} = ${m.en_gloss}`).join("\n");
}

function userContent(question: string, retrieval: Retrieval): string {
  return [
    `question:`,
    question,
    ``,
    `jurisdiction_scope: ${describeScope(retrieval.jurisdictions)}`,
    ``,
    `glossary:`,
    renderGlossary(retrieval),
    ``,
    `excerpts:`,
    renderExcerpts(retrieval),
  ].join("\n");
}

/**
 * Keeps only citations that point at an excerpt retrieval actually returned,
 * and fills the date from that excerpt's corpus record.
 */
export function groundCitations(
  cited: Generated["citations"],
  retrieval: Retrieval,
): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();

  for (const c of cited) {
    const chunk = retrieval.hits.find((h) => h.source_url === c.source_url);
    if (!chunk) continue; // not in what we retrieved — the model made it up
    const key = `${c.section_ref}|${c.source_url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      section_ref: c.section_ref || chunk.section_ref || chunk.doc_title || "(untitled)",
      source_url: chunk.source_url,
      as_of: chunk.retrieved_at.slice(0, 10),
      ...(chunk.doc_title ? { doc_title: chunk.doc_title } : {}),
    });
  }
  return out;
}

export function toAnswer(generated: Generated, retrieval: Retrieval): Answer | null {
  if (generated.kind === "refused") {
    const reason = generated.refusal_reason === "none" ? "out_of_scope" : generated.refusal_reason;
    const candidate = { kind: "refused" as const, text: generated.text, reason };
    const parsed = Answer.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }

  const citations = groundCitations(generated.citations, retrieval);
  const candidate = {
    kind: "answered" as const,
    text: generated.text,
    citations,
    jurisdiction_scope: generated.jurisdiction_scope,
    glossed_terms: generated.glossed_terms,
  };
  // An answered response with zero surviving citations fails here, by design:
  // the non-empty citations array in lib/schemas.ts is what rule 8 enforces.
  const parsed = Answer.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

let cachedClient: Anthropic | null = null;

function client(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

const RETRY_NOTE = [
  ``,
  `Your previous response could not be used. It was either missing a citation on an`,
  `answered response, or it cited a source_url that does not appear in the excerpts`,
  `above. Answer again using only the excerpts given, copying each source_url exactly.`,
  `If the excerpts do not contain the answer, set kind to "refused".`,
].join("\n");

export type GenerateDeps = { anthropic?: Anthropic };

/**
 * One attempt. Returns null on anything that is not a usable Answer, so the
 * caller's retry logic has a single condition to test.
 */
async function attempt(
  question: string,
  retrieval: Retrieval,
  deps: GenerateDeps,
  retrying: boolean,
): Promise<Answer | null> {
  try {
    const response = await (deps.anthropic ?? client()).messages.parse({
      model: ANSWER_MODEL,
      max_tokens: ANSWER_MAX_TOKENS,
      output_config: { effort: "medium", format: zodOutputFormat(Generated) },
      system: ANSWER_PROMPT,
      messages: [
        { role: "user", content: userContent(question, retrieval) + (retrying ? RETRY_NOTE : "") },
      ],
    });

    // Before the early returns: a refused or truncated answer is billed too,
    // and a retried row makes two of these calls.
    record(ANSWER_MODEL, response.usage);

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    if (!response.parsed_output) return null;

    return toAnswer(response.parsed_output, retrieval);
  } catch {
    return null;
  }
}

/**
 * Retries once on a contract violation, then fails closed to a refusal. It
 * never returns an unvalidated answer and never throws.
 *
 * The fail-closed reason is 'unavailable', not 'low_confidence': twice-failed
 * generation is an outage, and an eval cannot score a run in which the two are
 * indistinguishable. ADR-022.
 */
export async function generate(
  question: string,
  retrieval: Retrieval,
  deps: GenerateDeps = {},
): Promise<Answer> {
  return (
    (await attempt(question, retrieval, deps, false)) ??
    (await attempt(question, retrieval, deps, true)) ??
    refuse("unavailable")
  );
}
