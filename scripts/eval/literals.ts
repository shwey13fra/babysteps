// scripts/eval/literals.ts
//
// The deterministic, model-free half of grading: strings that are either
// present in a text or are not.
//
// `glossaryGerman`, `normalizeDigits` and `literalTokens` were MOVED here from
// run.ts unchanged (CLAUDE.md rule 1, exception of 2026-11-04) when the
// verbatim-presence sweep needed them. run.ts imports them; there is no second
// copy. Everything below `elementLiterals` is new and used ONLY by the sweep —
// the must_not channel's behaviour is deliberately untouched, because changing
// it would move scored results.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { refsIn } from "./citations";

/** The glossary's full German vocabulary: `de` keys plus every expand_with term. */
export function glossaryGerman(): string[] {
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

/** Strips thousand separators so '250.000 €' and '250 000' both match '250000'. */
export function normalizeDigits(text: string): string {
  return text.replace(/(\d)[., \s](?=\d{3}\b)/g, "$1");
}

export const GLOSSARY_DE = glossaryGerman();

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
export function literalTokens(clause: string): Array<{ kind: "number" | "term"; token: string }> {
  const out: Array<{ kind: "number" | "term"; token: string }> = [];
  for (const n of normalizeDigits(clause).match(/\d+/g) ?? []) {
    if (n.length >= 2) out.push({ kind: "number", token: n });
  }
  for (const term of GLOSSARY_DE) {
    if (new RegExp(`\\b${term}\\b`).test(clause)) out.push({ kind: "term", token: term });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Element literals — the verbatim-presence sweep only (ADR-068)
// ---------------------------------------------------------------------------

export type LiteralKind = "authority" | "ref" | "number" | "term";

export type ElementLiteral = { kind: LiteralKind; token: string };

/**
 * Lowercase German words that may sit INSIDE a proper name without ending it.
 * A connector can neither start nor end a name, so 'Ämter für Versorgung und
 * Soziales' survives intact while 'Elterngeld in Hessen is handled' stops at
 * 'is'.
 */
const CONNECTORS = new Set([
  "für",
  "und",
  "von",
  "vom",
  "der",
  "des",
  "dem",
  "den",
  "die",
  "das",
  "im",
  "in",
  "zur",
  "zum",
  "am",
  "an",
  "auf",
  "bei",
  "mit",
  "über",
]);

const WORD = /[\p{L}\p{N}][\p{L}\p{N}-]*/gu;

const isCapitalised = (w: string) => /^\p{Lu}/u.test(w) && w.length >= 3;

/**
 * Multi-word proper names in a text: runs of capitalised words, optionally
 * linked by the connectors above.
 *
 * A run counts only with **two or more capitalised words** and at least twelve
 * characters. That floor is the whole reason the sweep is usable: a bare
 * 'Hessen' appears in nearly every Hessian reply and would flag elements it
 * says nothing about, while 'Ämter für Versorgung und Soziales' appears only
 * where that authority is actually named.
 */
export function authorityPhrases(text: string): string[] {
  const out: string[] = [];

  // Punctuation ENDS a name. Without this, A-21 element 1's parenthetical
  // '(HÄVS)' glued itself onto the phrase before it, yielding
  // 'Ämter für Versorgung und Soziales HÄVS' — which appears in no reply, so
  // the sweep missed the one defect it was written to catch.
  for (const segment of text.split(/[^\p{L}\p{N}\s-]+/u)) {
    const words = [...segment.matchAll(WORD)].map((m) => m[0]);
    let run: string[] = [];
    let caps = 0;

    const flush = () => {
      // Trim trailing connectors: a name cannot end on 'und'.
      while (run.length && CONNECTORS.has(run[run.length - 1].toLowerCase())) run.pop();
      const phrase = run.join(" ");
      if (caps >= 2 && phrase.length >= 12) out.push(phrase);
      run = [];
      caps = 0;
    };

    for (const w of words) {
      if (isCapitalised(w)) {
        run.push(w);
        caps += 1;
      } else if (run.length && CONNECTORS.has(w.toLowerCase())) {
        run.push(w);
      } else {
        flush();
      }
    }
    flush();
  }
  return [...new Set(out)];
}

/**
 * Every distinctive literal in a required element's text: a named authority, a
 * § reference, a number, a glossary German term. Ordered most distinctive
 * first, because that is the order a reader should judge a flag in.
 */
export function elementLiterals(element: string): ElementLiteral[] {
  const out: ElementLiteral[] = [];
  for (const a of authorityPhrases(element)) out.push({ kind: "authority", token: a });
  for (const r of refsIn(element)) out.push({ kind: "ref", token: r });
  for (const { kind, token } of literalTokens(element)) out.push({ kind, token });
  const seen = new Set<string>();
  return out.filter((l) => {
    const k = `${l.kind}\u0000${l.token}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Whether a literal is present in a reply. Each kind is matched the way that
 * kind is actually written: a name case-insensitively and whitespace-agnostically
 * (the element says 'sechs hessischen Ämter', the reply 'the six Hessische
 * Ämter' — the shared run still matches), a § reference through the house
 * normaliser on both sides, a number after separator normalisation.
 */
export function literalPresent(literal: ElementLiteral, reply: string): boolean {
  if (literal.kind === "ref") return refsIn(reply).includes(literal.token);
  if (literal.kind === "number") {
    return new RegExp(`(?<!\\d)${literal.token}(?!\\d)`).test(normalizeDigits(reply));
  }
  if (literal.kind === "term") return new RegExp(`\\b${literal.token}\\b`).test(reply);
  const loose = literal.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(loose, "iu").test(reply);
}
