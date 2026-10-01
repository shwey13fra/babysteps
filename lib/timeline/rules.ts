// lib/timeline/rules.ts
//
// Loads data/rules/*.yaml and validates every rule before the engine sees it.
// A malformed rule fails loudly at load rather than producing a plausible wrong
// date, which is the whole point of putting the dates in YAML instead of prose.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { Anchor, DeadlineKind, Jurisdiction, SourceStatus, Track } from "../schemas";

/** One `applies_if` clause: exactly one profile field mapped to its allowed values. */
const Condition = z
  .record(z.string(), z.array(z.union([z.string(), z.boolean(), z.number()])).nonempty())
  .refine((c) => Object.keys(c).length === 1, {
    message: "a condition names exactly one profile field",
  });

export type Condition = z.infer<typeof Condition>;

const RuleShape = z.object({
  id: z.string().min(1),
  track: Track,
  jurisdiction: Jurisdiction,
  title_en: z.string().min(1),
  term_de: z.string().min(1).optional(),
  anchor: Anchor,
  window_open: z.object({ offset_days: z.number().int() }),
  deadline: z
    .object({
      offset_days: z.number().int(),
      kind: DeadlineKind,
      note_en: z.string().min(1).optional(),
    })
    .optional(),
  applies_if: z.object({ all: z.array(Condition).nonempty() }).optional(),
  authority_en: z.string().min(1),
  authority_local: z.string().min(1).optional(),
  consequence_en: z.string().min(1),
  documents: z.array(z.string().min(1)),
  source_ref: z.string().min(1),
  source_url: z.string().min(1),
  verified_on: z.iso.date().nullable(),
  source_status: SourceStatus.optional(),
  review_after: z.iso.date(),
});

/**
 * Two invariants that cannot be expressed in the object shape:
 *
 * 1. German-track items must carry a term_de that the glossary knows (rule 14).
 *    Consular items must not: inventing a German label for an Indian consular
 *    procedure is exactly the fabrication rule 14 exists to prevent.
 * 2. An unverified source must say so. Without this, verified_on: null can drift
 *    into a rule that looks checked because nothing forces the admission.
 */
export const Rule = RuleShape.superRefine((r, ctx) => {
  if (r.track === "german" && r.term_de === undefined) {
    ctx.addIssue({ code: "custom", path: ["term_de"], message: `${r.id}: german-track rules need term_de` });
  }
  if (r.verified_on === null && r.source_status !== "needs_manual_verification") {
    ctx.addIssue({
      code: "custom",
      path: ["source_status"],
      message: `${r.id}: verified_on is null, so source_status must be needs_manual_verification`,
    });
  }
  if (r.verified_on !== null && r.source_status === "needs_manual_verification") {
    ctx.addIssue({
      code: "custom",
      path: ["verified_on"],
      message: `${r.id}: marked needs_manual_verification but carries a verified_on date`,
    });
  }
});

export type Rule = z.infer<typeof Rule>;

const RULES_DIR = join(process.cwd(), "data", "rules");

/** Parses and validates one YAML file's worth of rules. Exported for tests. */
export function parseRuleFile(contents: string, label: string): Rule[] {
  const raw = parse(contents);
  if (!Array.isArray(raw)) throw new Error(`${label}: expected a YAML sequence of rules`);
  return raw.map((entry, i) => {
    const result = Rule.safeParse(entry);
    if (!result.success) {
      throw new Error(`${label}[${i}] invalid:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
  });
}

let cache: Rule[] | null = null;

/** Every rule in data/rules/, validated, with ids guaranteed unique. */
export function loadRules(dir: string = RULES_DIR): Rule[] {
  if (cache && dir === RULES_DIR) return cache;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort();

  const rules = files.flatMap((f) => parseRuleFile(readFileSync(join(dir, f), "utf8"), f));

  const seen = new Set<string>();
  for (const r of rules) {
    if (seen.has(r.id)) throw new Error(`Duplicate rule id across data/rules/: ${r.id}`);
    seen.add(r.id);
  }

  if (dir === RULES_DIR) cache = rules;
  return rules;
}
