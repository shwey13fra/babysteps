// Coverage and retrieval exclusions — ONE declared list, two denominators.
//
// WHY THIS MODULE EXISTS (human ruling, 2026-11-04)
//
// ADR-043 removed unreachable elements from the coverage denominator. ADR-050
// removed wholly-unreachable ROWS from the retrieval denominator. Both read
// `data/golden/coverage-exclusions.yaml`, and both must keep reading it:
//
//   "Add a standing check that the coverage and retrieval denominators are
//    derived from ONE exclusion list. Two lists that must agree by hand will
//    diverge again."
//
// The check is structural rather than a comparison between two lists, because a
// comparison can only notice a divergence that has already happened. There is
// one loader, one lookup, and one derivation here; the retrieval rule is defined
// as a predicate OVER the coverage entries, so a row cannot be excluded from
// retrieval without a coverage entry to excuse it. `assertSingleSource` then
// fails loudly if a future caller ever reintroduces a second source of truth.

import { parse as parseYaml } from "yaml";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clauses, parseElement } from "./clauses";

export type Exclusion = {
  row: string;
  element: string;
  reason: string;
  adr: string;
  dated: string;
  target: string;
};

/**
 * A golden-set row as `readCsv` returns it. Declared as the same index-signature
 * type rather than as a narrower shape, because `Record<string, string>` is not
 * assignable to `{ id: string; ... }` — TypeScript will not treat an index
 * signature as evidence that named keys exist. The two fields read here are
 * `id` and `required_answer_elements`.
 */
export type ExcludableRow = Record<string, string>;

export function loadExclusions(file: string): Exclusion[] {
  const raw = parseYaml(readFileSync(join(process.cwd(), file), "utf8")) as {
    version?: number;
    exclusions?: Exclusion[];
  };
  return raw.exclusions ?? [];
}

/** The requirement elements of a row, markers stripped. */
export function requirementTexts(row: ExcludableRow): string[] {
  return clauses(row.required_answer_elements)
    .map(parseElement)
    .filter((e) => e.kind === "requirement")
    .map((e) => e.text);
}

/** The coverage rule: this one element is declared unreachable. */
export function exclusionFor(
  list: readonly Exclusion[],
  rowId: string,
  element: string,
): Exclusion | undefined {
  return list.find((e) => e.row === rowId && e.element === element);
}

/**
 * The retrieval rule, defined ON the coverage entries: EVERY required element of
 * the row is declared unreachable, so the row cannot produce a retrieval hit and
 * leaves the scorable retrieval denominator (ADR-050).
 *
 * `length > 0` is load-bearing: `every` on an empty list is true, and a row with
 * no required elements must not be silently excluded.
 */
export function rowWhollyExcluded(list: readonly Exclusion[], row: ExcludableRow): boolean {
  const req = requirementTexts(row);
  return req.length > 0 && req.every((t) => Boolean(exclusionFor(list, row.id, t)));
}

/**
 * Throws unless every retrieval-excluded row is excused, element by element, by
 * entries in the SAME list the coverage denominator reads.
 *
 * Vacuously true as the code stands — `rowWhollyExcluded` is defined over that
 * list, so it cannot be otherwise. That is the point: it is a standing check
 * against a future second list, and it fails the moment one appears. Cheap, runs
 * before the first model call.
 */
export function assertSingleSource(
  list: readonly Exclusion[],
  rows: readonly ExcludableRow[],
  file: string,
): void {
  const problems: string[] = [];
  for (const row of rows) {
    if (!rowWhollyExcluded(list, row)) continue;
    for (const t of requirementTexts(row)) {
      if (!exclusionFor(list, row.id, t)) {
        problems.push(`${row.id}: excluded from retrieval but "${t}" is not in ${file}`);
      }
    }
  }
  if (problems.length) {
    throw new Error(
      [
        `The retrieval and coverage denominators have diverged.`,
        `Both must derive from ${file} alone (ADR-050, human ruling 2026-11-04):`,
        ...problems.map((t) => `  - ${t}`),
      ].join("\n"),
    );
  }
}

/**
 * Throws BEFORE the first model call if any declared exclusion no longer matches
 * exactly one requirement element of its row in the loaded golden set.
 *
 * Failing loud is the point. An entry that silently stopped matching would
 * re-admit an element to the scorable denominator and move a committed figure
 * with no diff to show for it; an entry that matched the WRONG element would
 * exclude something answerable. Either way the number moves and the audit trail
 * does not. golden-drift.ts's lesson, applied to the exclusion list.
 */
export function validateExclusions(
  list: readonly Exclusion[],
  rows: readonly ExcludableRow[],
  file: string,
  csv: string,
  goldenVersion: string,
): void {
  const problems: string[] = [];
  for (const x of list) {
    const row = rows.find((r) => r.id === x.row);
    if (!row) {
      problems.push(`${x.row}: no such row in ${csv}`);
      continue;
    }
    const hits = requirementTexts(row).filter((t) => t === x.element).length;
    if (hits !== 1) {
      const what = hits === 0 ? "no requirement element matches" : `${hits} elements match`;
      problems.push(`${x.row}: ${what} "${x.element}"`);
    }
  }
  if (problems.length) {
    throw new Error(
      [
        `${file} is stale against ${csv} (${goldenVersion}).`,
        `Fix the declaration or the golden set before spending a run:`,
        ...problems.map((t) => `  - ${t}`),
      ].join("\n"),
    );
  }
}
