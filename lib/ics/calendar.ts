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

/**
 * One reminder on one event. Never a cascade.
 *
 * WHY WE WRITE AN ALARM AT ALL, when the button deliberately promises no
 * reminders (ruling 2026-11-15). The device check measured what happens with no
 * VALARM in the file, and the two engines disagreed: **Apple showed `Alert:
 * None`, Google applied its account default and scheduled an e-mail at 11:30pm
 * the night before.** So the reminder a parent gets today is accidental — absent
 * on one platform, and on the other it arrives at half past eleven at night for
 * an office that opens at eight. With no reminder loop in the beta, the calendar
 * IS the reminder, so leaving it to chance is not a neutral choice.
 *
 * One per event, because twelve events each firing twice is how a parent mutes
 * the whole calendar — and a muted calendar is worse than no alarm.
 */
export type IcsAlarm = {
  /**
   * Hours relative to DTSTART, which for an all-day event is midnight local at
   * the start of that date. Negative is before. `+9` is 09:00 on the day
   * itself; `-159` is 09:00 six days and fifteen hours earlier.
   */
  offsetHours: number;
  /** What the alert says. Named, not alarmed — see lib/ics/events.ts. */
  description: string;
};

/** An all-day calendar entry. Times never appear: these are deadlines, not meetings. */
export type IcsEvent = {
  /** Stable per item, so a re-import updates rather than duplicates. */
  uid: string;
  /** ISO `YYYY-MM-DD`. Rendered as an all-day DATE value. */
  date: string;
  summary: string;
  description: string;
  url?: string;
  /** At most one. Absent means the client's own default applies. */
  alarm?: IcsAlarm;
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
 * Hours → an RFC 5545 §3.3.6 duration, as a TRIGGER value.
 *
 * `-159` → `-P6DT15H`. Days and hours rather than `-PT159H`: both are legal
 * grammar, but the day/hour form is what every real calendar emits, and this
 * file's whole premise is that we are read by other people's parsers.
 *
 * Zero is `PT0S` — `P` alone is not a valid duration, and an empty TRIGGER is
 * the kind of thing a strict parser rejects the entire VEVENT over.
 */
export function icsDuration(hours: number): string {
  if (hours === 0) return "PT0S";
  const sign = hours < 0 ? "-" : "";
  const abs = Math.abs(hours);
  const days = Math.floor(abs / 24);
  const rest = abs % 24;
  if (days === 0) return `${sign}PT${rest}H`;
  return rest === 0 ? `${sign}P${days}D` : `${sign}P${days}DT${rest}H`;
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
    // NO `METHOD`. Deliberate, ruled 2026-11-16 — ADR-085.
    //
    // METHOD belongs to iTIP (RFC 5546), the scheduling protocol: it marks a
    // file as a MESSAGE between an organiser and attendees. RFC 5545 §3.7.2
    // makes it optional, and a file that is simply a calendar entry — which is
    // all this is — should not claim to be an iTIP message at all.
    //
    // It was `METHOD:PUBLISH`, and Stage F found the cost on a real phone: a
    // parent mailed the file to themselves, opened it, and nothing happened.
    // A client reading METHOD treats the file as scheduling traffic and looks
    // for the ORGANIZER and ATTENDEE that an iTIP message must have. This file
    // has neither — it names no organiser and invites nobody, because a
    // statutory deadline is not a meeting.
    //
    // Without METHOD it is an ordinary calendar file to be imported, which is
    // exactly what it is. Whether that alone fixes the Gmail path is NOT
    // established — the evidence is vendor documentation, not a measurement,
    // and only a device can settle it. It is removed because claiming to be an
    // iTIP message was wrong on its own terms, and the import problem is what
    // made anyone look.
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
    // TRANSPARENT: a deadline does not occupy the day. Marked busy, twelve
    // all-day events would block a parent's availability outright, and anyone
    // who shares a calendar with them would see twelve phantom commitments.
    lines.push("TRANSP:TRANSPARENT");
    if (event.alarm) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `TRIGGER;RELATED=START:${icsDuration(event.alarm.offsetHours)}`,
        // RFC 5545 §3.6.6 requires DESCRIPTION on a DISPLAY alarm. A client that
        // gets an alarm with none shows an empty notification.
        `DESCRIPTION:${escapeText(event.alarm.description)}`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
