// lib/ics/calendar.ts
//
// RFC 5545 serialisation, pure. No dates are computed here: every date arrives
// from lib/timeline already decided (CLAUDE.md rule 4), and this file only
// formats it.
//
// WHY NOT THE `ics` PACKAGE, which CLAUDE.md rule 5 pre-approves. Three reasons,
// and the decision is ADR-077 so it can be reversed on one line of reasoning:
//
//  1. Folding is counted in OCTETS, not characters (RFC 5545 §3.1). Our content
//     is German and carries umlauts, so a character-counting fold produces
//     lines a strict parser rejects. That is the single most likely way this
//     file fails on a real calendar, and it is ~15 lines to do exactly right
//     and assert directly.
//  2. UID stability decides whether re-importing after a birth is recorded
//     UPDATES an event or duplicates it. That is a product decision, not a
//     formatting one, and it should be visible in our code.
//  3. It is sixty lines of pure function against a dependency on the edge.
//
// Everything below is testable without a network, a clock or a browser.

/** An all-day calendar entry. Times never appear: these are deadlines, not meetings. */
export type IcsEvent = {
  /** Stable per item, so a re-import updates rather than duplicates. */
  uid: string;
  /** ISO `YYYY-MM-DD`. Rendered as an all-day DATE value. */
  date: string;
  summary: string;
  description: string;
  url?: string;
};

/**
 * RFC 5545 §3.3.11 text escaping.
 *
 * Order matters: backslash first, or the escapes we add get escaped again.
 * A literal newline becomes `\n`, which is how a multi-paragraph DESCRIPTION
 * survives a single logical line.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * RFC 5545 §3.1 line folding: no line over 75 OCTETS, continuations begin with
 * one space.
 *
 * Octets, not characters, and never inside a UTF-8 sequence - splitting one
 * produces bytes no parser can read. "ä" is two octets, so a 75-character line
 * of German can be 90 octets and a naive fold is silently wrong on exactly the
 * content this product is made of.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let currentOctets = 0;
  // The continuation space costs an octet, so later segments hold 74.
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentOctets + size > limit) {
      out.push(current);
      current = "";
      currentOctets = 0;
      limit = 74;
    }
    current += char;
    currentOctets += size;
  }
  if (current) out.push(current);

  return out.join("\r\n ");
}

/** `2026-11-22` → `20261122`. From the ISO parts, never through Date(). */
export function toIcsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/**
 * A UTC timestamp for DTSTAMP, which RFC 5545 requires on every VEVENT.
 *
 * The one value here that is not derived from the engine. It is metadata about
 * the file, not about a deadline, so it does not breach rule 4 - and it is a
 * parameter rather than a clock read so tests are deterministic.
 */
export function toIcsTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * The calendar file.
 *
 * All-day events use `DTSTART;VALUE=DATE` with no DTEND. A deadline is a day,
 * not a span, and giving it a one-day DTEND makes some clients draw it across
 * two.
 *
 * CRLF throughout, including the final line, per RFC 5545 §3.1.
 */
export function buildCalendar(events: readonly IcsEvent[], now: Date): string {
  const stamp = toIcsTimestamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BabySteps Germany//Timeline//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
    );
    if (event.url) lines.push(`URL:${escapeText(event.url)}`);
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
