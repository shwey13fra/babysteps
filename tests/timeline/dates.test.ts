import { describe, expect, it } from "vitest";
import { addDays, assertISODate, diffDays, fromEpochDay, toEpochDay, todayISO } from "@/lib/timeline/dates";

describe("ISO date validation", () => {
  it("accepts a real date", () => {
    expect(assertISODate("2026-11-15")).toBe("2026-11-15");
  });

  it.each(["2026-13-01", "2026-00-10", "2026-02-30", "2027-02-29", "2026-11-5", "15/11/2026", ""])(
    "rejects %s",
    (bad) => {
      expect(() => assertISODate(bad)).toThrow();
    },
  );

  it("accepts a real leap day and rejects the non-leap one", () => {
    expect(assertISODate("2028-02-29")).toBe("2028-02-29");
    expect(() => assertISODate("2026-02-29")).toThrow();
  });
});

describe("offset math across boundaries", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("crosses a leap day forwards and backwards", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("skips 29 February in a non-leap year", () => {
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("counts 29 days in a leap February and 28 otherwise", () => {
    expect(diffDays("2028-02-01", "2028-03-01")).toBe(29);
    expect(diffDays("2027-02-01", "2027-03-01")).toBe(28);
  });

  it("reproduces the playbook's hand-verification offsets", () => {
    // Elternzeit notice: due date − 49 days
    expect(addDays("2026-11-15", -49)).toBe("2026-09-27");
    // Mutterschutz start: due date − 42 days
    expect(addDays("2026-11-15", -42)).toBe("2026-10-04");
    // Elterngeld soft deadline: + 92 days
    expect(addDays("2026-11-15", 92)).toBe("2027-02-15");
    // Consular registration: one year
    expect(addDays("2026-11-15", 365)).toBe("2027-11-15");
  });

  it("is symmetric and round-trips through epoch days", () => {
    const d = "2026-11-15";
    expect(addDays(addDays(d, 137), -137)).toBe(d);
    expect(fromEpochDay(toEpochDay(d))).toBe(d);
    expect(diffDays(d, addDays(d, 365))).toBe(365);
    expect(diffDays(addDays(d, 10), d)).toBe(-10);
  });

  it("refuses a fractional offset rather than silently truncating", () => {
    expect(() => addDays("2026-11-15", 1.5)).toThrow();
  });
});

describe("no timezone drift", () => {
  it("is unaffected by the host timezone", () => {
    // A local-time implementation returns 2026-11-14 here in any UTC-negative
    // zone. Epoch-day arithmetic cannot.
    expect(addDays("2026-11-15", 0)).toBe("2026-11-15");
    expect(toEpochDay("1970-01-01")).toBe(0);
    expect(fromEpochDay(0)).toBe("1970-01-01");
  });

  it("reads today in UTC, not local time", () => {
    expect(todayISO(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-15");
    expect(todayISO(new Date("2026-11-15T00:30:00Z"))).toBe("2026-11-15");
  });
});
