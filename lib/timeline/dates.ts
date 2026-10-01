// lib/timeline/dates.ts
//
// Date-only arithmetic. Every date in this product is a calendar date, never an
// instant, so nothing here constructs a local-time Date and nothing here reads a
// timezone. Dates are 'YYYY-MM-DD' strings; arithmetic goes through UTC epoch
// days and comes back as a string.
//
// Why this exists rather than `new Date(str)` + setDate(): new Date('2026-11-15')
// parses as UTC midnight, but new Date(2026, 10, 15) parses as LOCAL midnight,
// and getDate() on the first in a UTC-1 zone returns 14. Mixing the two is the
// single most common source of off-by-one-day bugs in date software, and in this
// product an off-by-one on a Standesamt deadline is a legal consequence.

/** A calendar date with no time and no zone, 'YYYY-MM-DD'. */
export type ISODate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Throws on anything that is not a real calendar date in 'YYYY-MM-DD' form. */
export function assertISODate(value: string): ISODate {
  const m = ISO_DATE.exec(value);
  if (!m) throw new Error(`Not an ISO date (YYYY-MM-DD): ${JSON.stringify(value)}`);
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12) throw new Error(`Month out of range: ${value}`);
  // Round-trip through UTC to reject 2026-02-30 and 2027-02-29 without a
  // hand-written leap-year rule.
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    throw new Error(`Not a real calendar date: ${value}`);
  }
  return value;
}

/** Days since 1970-01-01, UTC. */
export function toEpochDay(date: ISODate): number {
  const m = ISO_DATE.exec(assertISODate(date))!;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

/** Inverse of toEpochDay. */
export function fromEpochDay(day: number): ISODate {
  const d = new Date(day * MS_PER_DAY);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Calendar days added (or subtracted). Crosses months, years and leap days. */
export function addDays(date: ISODate, days: number): ISODate {
  if (!Number.isInteger(days)) throw new Error(`addDays needs an integer, got ${days}`);
  return fromEpochDay(toEpochDay(date) + days);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function diffDays(from: ISODate, to: ISODate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return toEpochDay(a) < toEpochDay(b);
}

export function isAfter(a: ISODate, b: ISODate): boolean {
  return toEpochDay(a) > toEpochDay(b);
}

/**
 * Today as a calendar date in UTC.
 *
 * Injectable because every status in this engine is relative to "today", and a
 * test that cannot pin today is a test that fails once a month. Production
 * passes nothing; tests pass a fixed date.
 */
export function todayISO(now: Date = new Date()): ISODate {
  const y = String(now.getUTCFullYear()).padStart(4, "0");
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}
