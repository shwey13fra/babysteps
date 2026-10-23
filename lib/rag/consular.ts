// lib/rag/consular.ts
//
// The hand-curated Indian consular sources, loaded and validated the way
// lib/timeline/rules.ts loads the deadline rules: a malformed entry fails loudly at
// load rather than becoming a citation the product shows to a family.
//
// WHY THIS FILE EXISTS AT ALL. The consular half of the product cannot be crawled.
// Measured 2026-10-23 with the project's own robots checker and User-Agent:
//
//   www.cgifrankfurt.gov.in    robots 200, Disallow: /          -> refused
//   www.indiacode.nic.in       robots 403                       -> refused (our policy)
//   indianembassyberlin.gov.in robots 404 then network error     -> flaky, unreliable
//   www.mea.gov.in             robots 200, no matching rule      -> permitted, but the
//                              Guide to Consular Services says only that missions
//                              "[r]egister the births and deaths of Indian citizens, in
//                              accordance with the relevant Indian laws" — no one-year
//                              rule, no documents, no minor-passport procedure.
//
// So the substance is reachable by a human with a browser and by no automated client we
// are willing to build. These entries are therefore transcribed under provenance, and
// every field here exists to make that provenance checkable later.
//
// WHAT THIS FILE IS NOT. It is not a place to record what we believe to be true. An
// entry may assert only what its cited source says on the date a human read it
// (past-mistakes 2026-10-23: "true" and "sourced" are different properties). And no
// entry may state an individual's entitlement or outcome — authority_en names who
// decides instead (CLAUDE.md rule 13).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { diffDays, todayISO } from "../timeline/dates";

/**
 * How the text got here.
 *
 * 'human_transcription' — a person opened the page in a browser and copied the passage.
 * The only route for Frankfurt and for the Citizenship Act.
 * 'permitted_fetch' — our client fetched it after a live robots check allowed it. Carries
 * robots_checked_on, because permission is perishable (ADR-016) and a recorded verdict
 * that nothing re-checks is the exact failure ADR-012 and ADR-014 both made.
 */
export const CurationMethod = z.enum(["human_transcription", "permitted_fetch"]);
export type CurationMethod = z.infer<typeof CurationMethod>;

/** Which mission the passage governs. 'federal' = MEA or Indian statute, all missions. */
export const Mission = z.enum(["federal", "frankfurt", "berlin"]);
export type Mission = z.infer<typeof Mission>;

/** The addendum sets consular review at 90 days, not a year: these are the volatile sources. */
export const MAX_REVIEW_DAYS = 90;

const EntryShape = z.object({
  id: z.string().min(1),
  mission: Mission,
  topic: z.enum(["birth_registration", "minor_passport", "oci", "general"]),
  title_en: z.string().min(1),
  /** What the source says, as close to verbatim as the medium allows. */
  text_en: z.string().min(1),
  /** The real page a human or our fetcher read. No placeholders — see the refine below. */
  source_url: z.url(),
  source_title: z.string().min(1),
  method: CurationMethod,
  /** Set only on permitted_fetch: the date the live robots check said yes. */
  robots_checked_on: z.iso.date().optional(),
  /** The date a human read the page, or our fetcher retrieved it. Never a guess. */
  checked_on: z.iso.date(),
  /** Who read it. A person's name or handle, or the fetcher's id. */
  checked_by: z.string().min(1),
  review_after: z.iso.date(),
  /** Rule 13: the office that decides the individual case. Never omitted. */
  authority_en: z.string().min(1),
  notes: z.string().optional(),
});

/**
 * The invariants that the object shape cannot carry. Each one is here because the
 * project has already been bitten by its absence somewhere.
 */
export const ConsularEntry = EntryShape.superRefine((e, ctx) => {
  const bad = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message: `${e.id}: ${message}` });

  // A URL that does not resolve to a page is not a citation. 'TBD' is allowed in
  // data/rules/*.yaml, where a rule may legitimately have no source yet; it is not
  // allowed here, because an entry's only purpose is to be cited.
  if (!/^https?:\/\//.test(e.source_url)) bad("source_url", "source_url must be an http(s) URL");

  // Reading a page tomorrow is not a thing that has happened.
  if (diffDays(todayISO(), e.checked_on) > 0) bad("checked_on", "checked_on is in the future");

  if (diffDays(e.checked_on, e.review_after) <= 0)
    bad("review_after", "review_after must fall after checked_on");

  // The 90-day ceiling, enforced rather than described. A one-year review date on a
  // consular page is how a transcription from 2026 gets cited in 2027 as current.
  const span = diffDays(e.checked_on, e.review_after);
  if (span > MAX_REVIEW_DAYS)
    bad("review_after", `review_after is ${span} days after checked_on, ceiling is ${MAX_REVIEW_DAYS}`);

  // Permission is a fact with a date, or it is not a fact (ADR-016).
  if (e.method === "permitted_fetch" && e.robots_checked_on === undefined)
    bad("robots_checked_on", "permitted_fetch requires robots_checked_on");
  if (e.method === "human_transcription" && e.robots_checked_on !== undefined)
    bad("robots_checked_on", "human_transcription needs no robots check; drop the field");
});

export type ConsularEntry = z.infer<typeof ConsularEntry>;

const CONSULAR_DIR = join(process.cwd(), "data", "consular");

/** Parses and validates one YAML file's worth of entries. Exported for tests. */
export function parseConsularFile(contents: string, label: string): ConsularEntry[] {
  const raw = parse(contents);
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${label}: expected a YAML sequence of entries`);
  return raw.map((entry, i) => {
    const result = ConsularEntry.safeParse(entry);
    if (!result.success) {
      throw new Error(`${label}[${i}] invalid:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
  });
}

/** Every entry in data/consular/, validated, with ids guaranteed unique. */
export function loadConsular(dir: string = CONSULAR_DIR): ConsularEntry[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort();

  const entries = files.flatMap((f) => parseConsularFile(readFileSync(join(dir, f), "utf8"), f));

  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.id)) throw new Error(`Duplicate consular entry id across data/consular/: ${e.id}`);
    seen.add(e.id);
  }
  return entries;
}

export type Staleness = {
  entry: ConsularEntry;
  /** Days past review_after. Positive means overdue for a re-read. */
  days_overdue: number;
};

/**
 * The entries whose review date has passed, worst first.
 *
 * This is the countermeasure to the one risk hand-curation carries that crawling does
 * not: staleness here is invisible, because nothing re-reads the page. A date in a YAML
 * file that no process ever compares against today is decoration.
 */
export function staleEntries(entries: ConsularEntry[], today: string = todayISO()): Staleness[] {
  return entries
    .map((entry) => ({ entry, days_overdue: diffDays(entry.review_after, today) }))
    .filter((s) => s.days_overdue > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue);
}
