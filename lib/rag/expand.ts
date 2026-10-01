// lib/rag/expand.ts
//
// Bridges the language gap between an English question and a German corpus.
// Deterministic, zero-latency, unit-testable — no LLM call. Runs between the
// medical guard and retrieval.
//
// The vector half of match_chunks handles English->German on its own if the
// embedding model is multilingual (voyage-3 is; verify in ADR-007). The lexical
// half cannot: to_tsvector('german', ...) has no English stems to match against.
// This module gives it something to match.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

type Term = {
  de: string;
  en_gloss: string;
  en_triggers: string[];
  expand_with: string[];
};

type Glossary = { version: number; terms: Term[]; excluded: string[] };

const glossary: Glossary = parse(
  readFileSync(join(process.cwd(), "data/glossary.de-en.yaml"), "utf8"),
);

// Longest triggers first, so "parental leave" wins over "leave from work".
const triggers: Array<{ pattern: RegExp; term: Term }> = glossary.terms
  .flatMap((term) => term.en_triggers.map((t) => ({ trigger: t, term })))
  .sort((a, b) => b.trigger.length - a.trigger.length)
  .map(({ trigger, term }) => ({
    pattern: new RegExp(`\\b${escapeRegex(trigger)}\\b`, "i"),
    term,
  }));

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type Expansion = {
  /** Original question, unchanged. Embed THIS, not the expanded string. */
  original: string;
  /** Original + German terms. Pass as query_text to match_chunks. */
  lexicalQuery: string;
  /** Glossary entries that fired — surface these in the UI as term glosses. */
  matched: Array<{ de: string; en_gloss: string }>;
};

export function expandQuery(question: string): Expansion {
  const seen = new Set<string>();
  const germanTerms: string[] = [];
  const matched: Expansion["matched"] = [];

  for (const { pattern, term } of triggers) {
    if (seen.has(term.de) || !pattern.test(question)) continue;
    seen.add(term.de);
    matched.push({ de: term.de, en_gloss: term.en_gloss });
    for (const w of term.expand_with) germanTerms.push(w);
  }

  // If the question already contains German (users paste terms from letters),
  // the lexical half works unaided — expansion just adds more signal.
  const lexicalQuery = [question, ...germanTerms].join(" ");

  return { original: question, lexicalQuery, matched };
}

// Test cases worth writing in tests/rag/expand.test.ts:
//   "How long after birth can we apply for Elterngeld"  -> expands Elterngeld (trigger matches the German word itself)
//   "Can my employer fire me while pregnant"            -> expands Kündigungsschutz
//   "How do we insure the baby"                         -> expands Familienversicherung, NOT Krankenkasse alone
//   "Which prenatal screening test should we choose"    -> expands NOTHING (guard deflects before this runs)
//   "What is the Kita voucher process"                  -> expands NOTHING (excluded list)
//   A question matching three terms                     -> all three, no duplicates, stable order
