// ADR-084 — a link written into a file that outlives the deployment.
//
// The defect this guards was real and measured on 2026-11-16: the first green
// deployment wrote `https://babysteps-germany-6vvsmfqt1-….vercel.app/item/…`
// into every calendar entry. That host answers **302 to a Vercel login page**
// while the production alias answers 200, so a parent tapping "record the birth
// here" months later would reach a login wall — silent staleness one layer past
// where we can correct it.
//
// The ruling: drop the link, keep the file. The deadline, the date and the
// alarm are what the export is for, and none of them need a URL.
//
// Both link sites are asserted, because the file carries two and dropping only
// the obvious one leaves the login wall in the prose of exactly the six events
// that move when a birth is recorded.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/timeline";
import { TimelineResponse } from "@/lib/schemas";
import type { IntakeProfile } from "@/lib/schemas";
import { buildCalendar } from "@/lib/ics/calendar";
import { eventDescription, toEvents } from "@/lib/ics/events";
import { siteUrl, siteUrlForPersistedFile } from "@/lib/site-url";

const ALIAS = "https://babysteps-germany.vercel.app";
const DEPLOYMENT = "babysteps-germany-6vvsmfqt1-shwey13fras-projects.vercel.app";
const TODAY = "2026-11-15";

const PROFILE: IntakeProfile = {
  due_date: "2026-12-26",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

const items = TimelineResponse.parse(buildTimeline(PROFILE, { today: TODAY })).items;
const estimated = items.filter((i) => i.certainty === "estimated");

const KEYS = ["NEXT_PUBLIC_SITE_URL", "VERCEL_URL", "VERCEL_ENV"] as const;
const saved: Record<string, string | undefined> = {};

function calendarNow(origin: string | null): string {
  return buildCalendar(toEvents(items, origin, PROFILE.bundesland), new Date("2026-11-15T09:00:00Z"));
}

describe("siteUrlForPersistedFile", () => {
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns the alias when one is configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = ALIAS;
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = DEPLOYMENT;
    expect(siteUrlForPersistedFile()).toBe(ALIAS);
  });

  it("refuses the VERCEL_URL fallback in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = DEPLOYMENT;
    expect(siteUrlForPersistedFile()).toBeNull();
    // The exact state that shipped on 2026-11-16: siteUrl() still answers, and
    // what it answers is the host behind the login wall. The two functions
    // disagreeing here IS the fix.
    expect(siteUrl()).toBe(`https://${DEPLOYMENT}`);
  });

  it("gives a preview its own origin, because that file is read immediately", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = DEPLOYMENT;
    expect(siteUrlForPersistedFile()).toBe(`https://${DEPLOYMENT}`);
  });

  it("is keyed on VERCEL_ENV, not NODE_ENV", () => {
    // NODE_ENV is "production" for every built deployment including previews.
    // Keying on it would strip the link from preview files where it is good.
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = DEPLOYMENT;
    expect(process.env.NODE_ENV).toBe("test");
    expect(siteUrlForPersistedFile()).not.toBeNull();
  });

  it("falls back to localhost in local development", () => {
    expect(siteUrlForPersistedFile()).toBe("http://localhost:3000");
  });

  it("trims and de-slashes the alias, as siteUrl does", () => {
    process.env.NEXT_PUBLIC_SITE_URL = `  ${ALIAS}/  `;
    expect(siteUrlForPersistedFile()).toBe(ALIAS);
  });
});

describe("the calendar file with an alias configured", () => {
  const ics = calendarNow(ALIAS);

  it("carries the URL property on every event", () => {
    const urls = ics.split("\r\n").filter((l) => l.startsWith("URL:"));
    expect(urls.length).toBe(items.length);
    for (const line of urls) expect(line).toContain(`${ALIAS}/item/`);
  });

  it("carries the /birth link in every estimated-date description", () => {
    expect(estimated.length).toBeGreaterThan(0);
    for (const item of estimated) {
      expect(eventDescription(item, ALIAS)).toContain(`${ALIAS}/birth`);
    }
  });
});

describe("the calendar file with no origin worth writing down", () => {
  const ics = calendarNow(null);

  it("writes no URL property at all", () => {
    expect(ics.split("\r\n").filter((l) => l.startsWith("URL:"))).toEqual([]);
  });

  it("writes no link anywhere in the file, folded lines included", () => {
    // Unfold first: a URL split across a continuation line would defeat a naive
    // substring search, and folding is exactly what happens to long lines here.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).not.toContain("vercel.app/item/");
    expect(unfolded).not.toContain("vercel.app/birth");
    expect(unfolded).not.toContain("localhost");
    expect(unfolded).not.toContain("null/");
    expect(unfolded).not.toContain("undefined");
  });

  it("still keeps the estimated-date honesty, which is not the link", () => {
    for (const item of estimated) {
      const text = eventDescription(item, null);
      expect(text).toContain("It will move when the birth is recorded.");
      expect(text).toMatch(/This date is/);
      // Not "no http" — the source URL belongs here and is not ours to drop.
      // Only OUR origin goes, in any of the three forms it could take.
      expect(text).not.toContain("vercel.app");
      expect(text).not.toContain("localhost");
      expect(text).not.toContain("/birth");
    }
  });

  it("is still a valid calendar with its alarm and every event", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(items.length);
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("DTSTART;VALUE=DATE:");
  });

  it("keeps the source URL, which is not ours and does not go stale", () => {
    // Only OUR origin is dropped. gesetze-im-internet.de is the provenance the
    // entry promises, and it is as good in ten years as today.
    expect(ics.replace(/\r\n /g, "")).toContain("gesetze-im-internet.de");
  });
});

describe("negative controls (CLAUDE.md rule 16)", () => {
  // Three gates have reached production able only to pass. These prove the two
  // assertions above can still go red.

  it("the no-URL-property check fails when a URL is present", () => {
    const ics = calendarNow(ALIAS);
    expect(ics.split("\r\n").filter((l) => l.startsWith("URL:")).length).toBeGreaterThan(0);
  });

  it("the no-link-anywhere check fails on the host that shipped the defect", () => {
    const ics = calendarNow(`https://${DEPLOYMENT}`).replace(/\r\n /g, "");
    expect(ics).toContain("vercel.app/item/");
    expect(ics).toContain("vercel.app/birth");
  });

  it("the estimated-date set is non-empty, so the link assertions are not vacuous", () => {
    expect(estimated.length).toBeGreaterThan(0);
    expect(items.length).toBeGreaterThan(estimated.length);
  });
});
