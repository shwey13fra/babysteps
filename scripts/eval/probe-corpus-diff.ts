// scripts/eval/probe-corpus-diff.ts
//
// The corpus before/after retrieval check, owed since the 2026-11-03 session
// journal, section 4 (knowledge/sessions/2026-11-03-both-figures-and-two-cancelled-parts.md).
//
// WHY IT EXISTS. ADR-044 ingested four sources and I certified them with
// `probe-displacement`'s "0 rows dropped a chunk". That script compares
// completion OFF against ON inside ONE corpus; it cannot see corpus-before
// against corpus-after, which was the actual question and, as iter6 then
// measured, the actual largest effect: the four sources cost TWO retrieval
// hits, A-12 and A-13 both losing PStG §18 out of the ranked top-8. The
// confirmatory-looking empty list was structurally guaranteed to be empty.
// knowledge/past-mistakes.md, "non-empty is not evidence".
//
// WHY IT IS A SNAPSHOT AND NOT A TWO-CORPUS QUERY. `match_chunks` takes no
// corpus_version parameter (supabase/migrations/0005_statute_quota.sql:36-44):
// it ranks across every row in the table. Asking it for "the corpus as it was"
// would need an RPC parameter and a migration, and reimplementing the hybrid
// rrf ranking locally would mean grading the instrument with a second
// instrument. So the state is captured as a FILE before the ingestion and
// diffed against a second file after it. That also puts the discipline in the
// right place: the before-snapshot has to be taken before the push, which is
// exactly the step that was skipped.
//
// ONE EMBEDDING PER ROW, NO MODEL CALL.
//
// Run:
//   npx tsx scripts/eval/probe-corpus-diff.ts --snapshot before
//   ... ingest, push ...
//   npx tsx scripts/eval/probe-corpus-diff.ts --snapshot after
//   npx tsx scripts/eval/probe-corpus-diff.ts --diff <before.json> <after.json>
//
// The diff's headline is the only number that matters: rows where the primary
// ground-truth reference WAS in the ranked top-8 and now is NOT.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { retrieve } from "../../lib/rag/retrieve";
import type { Bundesland } from "../../lib/schemas";
import { readCsv } from "./csv";
import { refsIn, normalizeRef, normalizeUrl } from "./citations";
import { todayISO } from "../../lib/timeline/dates";

const CSV = "data/golden/golden_set_v1.10.csv";
const GOLDEN_VERSION = "v1.10";
const OUT_DIR = "eval/reports";

/** Seventh copy. calibrate.ts:32 already flags the extraction as owed (CLAUDE.md rule 1). */
function bundeslandFor(override: string): Bundesland {
  if (!override) return "hessen";
  try {
    const b = (JSON.parse(override) as Record<string, unknown>).bundesland;
    if (b === "hessen" || b === "berlin") return b;
  } catch {
    // Unparseable: run.ts falls back to the default too.
  }
  return "hessen";
}

type RowSnapshot = {
  id: string;
  category: string;
  bundesland: Bundesland;
  /** The primary ground-truth reference, or null where the row names no §. */
  primaryRef: string | null;
  primaryUrl: string | null;
  /** Scored exactly as run.ts scores retrievalHit, against the RANKED top-8. */
  hit: boolean;
  /** 1-based position of the primary ref in the ranked list, null if absent. */
  rank: number | null;
  rankedRefs: Array<string | null>;
  rankedIds: number[];
  topCosine: number | null;
  corpusVersion: string | null;
};

type Snapshot = {
  kind: "corpus-retrieval-snapshot";
  name: string;
  date: string;
  golden: string;
  rows: RowSnapshot[];
};

/** A filename that never overwrites evidence: run.ts's collision suffix. */
function freePath(base: string, ext: string): string {
  let p = join(process.cwd(), OUT_DIR, `${base}.${ext}`);
  let n = 1;
  while (existsSync(p)) {
    n += 1;
    p = join(process.cwd(), OUT_DIR, `${base}-${n}.${ext}`);
    if (n > 50) throw new Error(`refusing to find a free name for ${base}.${ext}`);
  }
  return p;
}

async function snapshot(name: string, onlyCategory: string | null): Promise<void> {
  const all = readCsv(readFileSync(join(process.cwd(), CSV), "utf8"));
  const rows = all.filter((r) => (onlyCategory ? r.category === onlyCategory : true));

  console.log(`golden ${GOLDEN_VERSION} - ${rows.length} rows${onlyCategory ? ` (${onlyCategory} only)` : ""}`);
  console.log(`snapshot "${name}" - one embedding per row, no model calls\n`);

  const out: RowSnapshot[] = [];

  for (const row of rows) {
    const bundesland = bundeslandFor(row.profile_override);
    const r = await retrieve(row.question, { bundesland });

    const groundRefs = refsIn(row.ground_truth_source);
    const groundUrl = row.ground_truth_url ? normalizeUrl(row.ground_truth_url) : null;
    const primaryRef = groundRefs[0] ?? null;

    const rankedRefs = r.ranked.map((h) => (h.section_ref ? normalizeRef(h.section_ref) : null));
    const rankedUrls = r.ranked.map((h) => normalizeUrl(h.source_url));

    // run.ts's rule, reproduced deliberately rather than imported: a ref hit,
    // or the ground-truth URL where the row names no §.
    const refPos = primaryRef ? rankedRefs.indexOf(primaryRef) : -1;
    const urlHit = groundUrl ? rankedUrls.includes(groundUrl) : false;
    const hit = refPos !== -1 || urlHit;

    const snap: RowSnapshot = {
      id: row.id,
      category: row.category,
      bundesland,
      primaryRef,
      primaryUrl: groundUrl,
      hit,
      rank: refPos === -1 ? null : refPos + 1,
      rankedRefs,
      rankedIds: r.ranked.map((h) => h.id),
      topCosine: r.ranked.length ? Math.max(...r.ranked.map((h) => h.cosine)) : null,
      corpusVersion: r.ranked[0]?.corpus_version ?? null,
    };
    out.push(snap);

    console.log(
      `${snap.id.padEnd(5)} ${snap.category.padEnd(7)} ` +
        `${(snap.primaryRef ?? snap.primaryUrl ?? "-").slice(0, 34).padEnd(34)} ` +
        `${snap.hit ? "hit" : "MISS"}` +
        `${snap.rank ? ` @${snap.rank}` : ""}`,
    );
  }

  const hits = out.filter((r) => r.category === "ANSWER" && r.hit).length;
  const ans = out.filter((r) => r.category === "ANSWER").length;
  console.log(`\nANSWER rows: ${hits}/${ans} hit`);

  const path = freePath(`corpus-snapshot-${name}-${todayISO()}`, "json");
  mkdirSync(join(process.cwd(), OUT_DIR), { recursive: true });
  const payload: Snapshot = {
    kind: "corpus-retrieval-snapshot",
    name,
    date: todayISO(),
    golden: GOLDEN_VERSION,
    rows: out,
  };
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`snapshot written: ${path}`);
}

function load(p: string): Snapshot {
  const s = JSON.parse(readFileSync(p, "utf8")) as Snapshot;
  if (s.kind !== "corpus-retrieval-snapshot") throw new Error(`${p} is not a corpus snapshot`);
  return s;
}

function diff(pathA: string, pathB: string): void {
  const a = load(pathA);
  const b = load(pathB);

  if (a.golden !== b.golden) {
    console.log(`WARNING: golden differs (${a.golden} vs ${b.golden}) - this is not a corpus diff alone.\n`);
  }

  console.log(`before: ${a.name} (${a.date})   after: ${b.name} (${b.date})`);
  console.log(`golden ${a.golden}\n`);

  const byId = new Map(b.rows.map((r) => [r.id, r]));
  const lost: string[] = [];
  const gained: string[] = [];
  const moved: string[] = [];
  let compared = 0;

  for (const ra of a.rows) {
    const rb = byId.get(ra.id);
    if (!rb) {
      console.log(`${ra.id.padEnd(5)} absent from the after-snapshot`);
      continue;
    }
    compared += 1;

    const droppedIds = ra.rankedIds.filter((id) => !rb.rankedIds.includes(id));
    const addedIds = rb.rankedIds.filter((id) => !ra.rankedIds.includes(id));

    if (ra.hit && !rb.hit) lost.push(ra.id);
    if (!ra.hit && rb.hit) gained.push(ra.id);
    if (ra.hit && rb.hit && ra.rank !== rb.rank) moved.push(`${ra.id} @${ra.rank}->@${rb.rank}`);

    const flag = ra.hit && !rb.hit ? "  ** LOST **" : !ra.hit && rb.hit ? "  ** GAINED **" : "";
    if (flag || droppedIds.length || addedIds.length) {
      console.log(
        `${ra.id.padEnd(5)} ${(ra.primaryRef ?? ra.primaryUrl ?? "-").slice(0, 28).padEnd(28)} ` +
          `${ra.hit ? "hit" : "MISS"}${ra.rank ? `@${ra.rank}` : ""} -> ` +
          `${rb.hit ? "hit" : "MISS"}${rb.rank ? `@${rb.rank}` : ""}` +
          ` | top-8 -${droppedIds.length} +${addedIds.length}${flag}`,
      );
    }
  }

  console.log(`\nrows compared              : ${compared}`);
  console.log(`rows that LOST their ref   : ${lost.length}${lost.length ? ` - ${lost.join(", ")}` : ""}`);
  console.log(`rows that GAINED a hit     : ${gained.length}${gained.length ? ` - ${gained.join(", ")}` : ""}`);
  console.log(`rank moved, still a hit    : ${moved.length}${moved.length ? ` - ${moved.join(", ")}` : ""}`);
  console.log(
    `\nThe first number is the gate: a ref that was in the ranked top-8 and is not any more ` +
      `is a regression the ingestion caused, whatever the coverage figure does.`,
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const catIdx = argv.indexOf("--category");
  const onlyCategory = catIdx === -1 ? null : argv[catIdx + 1];

  const diffIdx = argv.indexOf("--diff");
  if (diffIdx !== -1) {
    const a = argv[diffIdx + 1];
    const b = argv[diffIdx + 2];
    if (!a || !b) throw new Error("--diff needs two snapshot paths");
    diff(a, b);
    return;
  }

  const snapIdx = argv.indexOf("--snapshot");
  const name = snapIdx === -1 ? "now" : (argv[snapIdx + 1] ?? "now");
  if (name.startsWith("--")) throw new Error("--snapshot needs a name");
  await snapshot(name, onlyCategory);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
