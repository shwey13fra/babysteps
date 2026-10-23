// scripts/eval/consular-staleness.ts
//
// Makes hand-curation's one real weakness visible. A crawled source re-announces itself
// every ingest; a transcribed one goes stale silently, because nothing re-reads the page.
// A review_after date that no process compares against today is decoration.
//
// Exits 1 when any entry is overdue, so this can gate a release rather than be read.
//
// Run: npx tsx scripts/eval/consular-staleness.ts [--as-of YYYY-MM-DD]

import { loadConsular, staleEntries, MAX_REVIEW_DAYS } from "../../lib/rag/consular";
import { diffDays, todayISO } from "../../lib/timeline/dates";

const argv = process.argv.slice(2);
const asOfFlag = argv.indexOf("--as-of");
const today = asOfFlag === -1 ? todayISO() : argv[asOfFlag + 1];

const entries = loadConsular();
console.log(`data/consular/: ${entries.length} entries · as of ${today} · ceiling ${MAX_REVIEW_DAYS} days\n`);

if (entries.length === 0) {
  console.log("No entries. The consular answer track is mute until this file has content.");
  process.exit(1);
}

const stale = staleEntries(entries, today);

for (const e of entries) {
  const overdue = stale.find((s) => s.entry.id === e.id);
  const left = diffDays(today, e.review_after);
  const mark = overdue ? `STALE +${overdue.days_overdue}d` : `ok ${left}d left`;
  console.log(`  ${mark.padEnd(16)} ${e.id}`);
  console.log(`  ${" ".repeat(16)} ${e.mission}/${e.topic} · ${e.method} · read ${e.checked_on} by ${e.checked_by}`);
  console.log(`  ${" ".repeat(16)} ${e.source_url}`);
}

console.log(`\nSummary — ${entries.length} entries, ${stale.length} overdue for a re-read.`);

if (stale.length > 0) {
  console.log("\nA stale entry must be re-read at its source and its checked_on updated, or removed.");
  console.log("Do not extend review_after without opening the page: that is the staleness, written down.");
  process.exit(1);
}
