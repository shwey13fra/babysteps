// lib/legal.ts
//
// The Impressum details, from the environment.
//
// CLAUDE.md, "Never do": the address is never hard-coded. Once this repo is
// public that address is permanent and, unlike a key, it cannot be rotated.
//
// ALL OR NOTHING, which is the one design decision in this file. A legally
// required provider identification that renders three of its four lines is
// worse than one that renders none: it looks complete, so nobody notices it is
// not, and DDG §5 is the most commonly enforced obligation in German web law —
// enforced by competitors and Abmahnung firms rather than by regulators
// (docs/legal-compliance-pack.md §1). So a missing value makes the whole set
// unavailable and the page says so loudly.
//
// Whitespace counts as missing. An env var set to " " in a dashboard is the
// shape this would otherwise fail in.

export const IMPRESSUM_KEYS = [
  "IMPRESSUM_NAME",
  "IMPRESSUM_STREET",
  "IMPRESSUM_CITY",
  "IMPRESSUM_EMAIL",
] as const;

export type ImpressumKey = (typeof IMPRESSUM_KEYS)[number];

export type ImpressumDetails = {
  /** Full legal name of the natural person providing the service. */
  name: string;
  /** Street and number. A Postfach does not satisfy §5. */
  street: string;
  /** Postal code and city. */
  city: string;
  /** An address that is actually monitored. */
  email: string;
};

export type ImpressumResult =
  | { ok: true; details: ImpressumDetails }
  | { ok: false; missing: ImpressumKey[] };

export function readImpressum(env: Record<string, string | undefined>): ImpressumResult {
  const missing = IMPRESSUM_KEYS.filter((k) => !(env[k] ?? "").trim());
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    details: {
      name: (env.IMPRESSUM_NAME ?? "").trim(),
      street: (env.IMPRESSUM_STREET ?? "").trim(),
      city: (env.IMPRESSUM_CITY ?? "").trim(),
      email: (env.IMPRESSUM_EMAIL ?? "").trim(),
    },
  };
}

/**
 * The supervisory authority for the controller's Bundesland.
 *
 * Hesse, confirmed by the operator on 2026-11-15. Art. 77 gives every data
 * subject the right to complain to a supervisory authority, and naming the
 * wrong one sends a complaint to an office that has no competence for it.
 */
export const SUPERVISORY_AUTHORITY = {
  name: "Der Hessische Beauftragte für Datenschutz und Informationsfreiheit",
  url: "https://datenschutz.hessen.de",
} as const;

/**
 * Vercel's stated retention for runtime logs on the plan in use.
 *
 * NOT A GUESS, AND NOT A CERTAINTY. Vercel's runtime-logs documentation lists
 * one hour for Hobby; an older limits table says twelve hours, and a secondary
 * report of a change could not be confirmed against Vercel's own docs. The page
 * therefore ATTRIBUTES the figure to Vercel and dates it, rather than asserting
 * it as our own fact — the same provenance rule the product applies to every
 * legal deadline it shows.
 *
 * **Re-check before launch and after any plan change**, and update here. It is
 * on the Stage E checklist for that reason.
 */
export const VERCEL_LOG_RETENTION = {
  value: "etwa eine Stunde",
  plan: "Hobby",
  checkedOn: "2026-11-15",
} as const;

/**
 * Every processor that touches a visitor's data, with what it does and where.
 *
 * TRACED FROM THE CODE, NOT COPIED FROM THE PLAN. The legal pack's §2 table
 * predates the choice of embedding provider and lists five processors; this
 * list has OpenAI in it, because lib/rag/retrieve.ts posts the visitor's
 * question text to api.openai.com to build the search vector before anything
 * reaches Anthropic. A processor that handles user-typed content and is missing
 * from the Art. 13 disclosure is the disclosure being wrong.
 *
 * Resend is absent because F6 is deferred and nothing in the shipped code
 * references it (confirmed 2026-11-15). It returns here when reminders ship.
 */
export const PROCESSORS = [
  {
    name: "Vercel Inc.",
    role: "Hosting und Auslieferung der Website",
    place: "Region Frankfurt am Main (fra1); Unternehmenssitz USA",
  },
  {
    name: "Supabase Inc.",
    role: "Datenbank für die zitierten Quellentexte",
    place: "Region eu-central-1 (Frankfurt am Main); Unternehmenssitz USA",
  },
  {
    name: "Anthropic PBC",
    role: "Erzeugung der Antwort auf eine gestellte Frage",
    place: "USA",
  },
  {
    name: "OpenAI, L.L.C.",
    role: "Umwandlung der Frage in einen Suchvektor (Embedding)",
    place: "USA",
  },
  {
    name: "Upstash, Inc.",
    role: "Zählung der Anfragen pro IP-Adresse zur Missbrauchsabwehr",
    place: "USA",
  },
] as const;
