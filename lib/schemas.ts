// lib/schemas.ts
//
// The contracts. Everything crossing a boundary — intake form, engine output,
// /api/ask response — is validated here. zod 4: ISO formats live on z.iso.*,
// which reject 2026-02-30 and 2026-13-01 rather than regex-matching the shape.

import { z } from "zod";
import { diffDays, todayISO } from "./timeline/dates";

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export const Bundesland = z.enum(["hessen", "berlin"]);
export type Bundesland = z.infer<typeof Bundesland>;

/**
 * The seven intake answers plus the two F2b birth fields.
 *
 * birth_date is rejected when it is in the future: a timeline computed from a
 * birth that has not happened would mark hard deadlines confirmed on the
 * strength of a typo.
 */
export const IntakeProfile = z
  .object({
    due_date: z.iso.date(),
    bundesland: Bundesland,
    city: z.string().min(1),
    employment_status: z.enum(["employed", "self-employed", "not-employed"]),
    insurance: z.literal("gkv"),
    nationalities: z.tuple([z.string().min(1), z.string().min(1)]),
    marital_status: z.enum(["married", "unmarried"]),
    first_child: z.boolean(),
    /** Manual override. Wins over the derived value in both directions. */
    premature: z.boolean().optional(),
    /** Set by F2b once the baby has arrived. */
    birth_date: z.iso.date().optional(),
    birth_recorded_at: z.iso.datetime().optional(),
  })
  .refine((p) => p.birth_date === undefined || diffDays(todayISO(), p.birth_date) <= 0, {
    message: "birth_date cannot be in the future",
    path: ["birth_date"],
  });

export type IntakeProfile = z.infer<typeof IntakeProfile>;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const Track = z.enum(["german", "consular"]);
export type Track = z.infer<typeof Track>;

/** Matches the corpus_chunks CHECK constraint in brief §3. Note 'hesse', not 'hessen'. */
export const Jurisdiction = z.enum(["federal", "hesse", "berlin", "consular-india"]);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

/** hard = the law removes the right · soft = money is lost · advisory = practice. */
export const DeadlineKind = z.enum(["hard", "soft", "advisory"]);
export type DeadlineKind = z.infer<typeof DeadlineKind>;

export const Anchor = z.enum(["due_date", "birth"]);
export type Anchor = z.infer<typeof Anchor>;

/**
 * 'estimated' whenever a birth-anchored item is computed from the due date as a
 * placeholder. The UI keys its dashed-versus-solid treatment off this, which is
 * what makes the honesty visible instead of a footnote (addendum §1).
 */
export const Certainty = z.enum(["estimated", "confirmed"]);
export type Certainty = z.infer<typeof Certainty>;

/**
 * 'upcoming' is in brief §5 and design-system.md §5 but was absent from the
 * Phase 1 instruction; without it most of a 40-week timeline has no status.
 */
export const ItemStatus = z.enum(["upcoming", "current", "urgent", "overdue", "past"]);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const SourceStatus = z.enum(["verified", "needs_manual_verification"]);
export type SourceStatus = z.infer<typeof SourceStatus>;

export const TimelineItem = z.object({
  id: z.string().min(1),
  title_en: z.string().min(1),
  /** Absent only on consular items: there is no German term for an Indian procedure. */
  term_de: z.string().min(1).optional(),
  track: Track,
  jurisdiction: Jurisdiction,
  anchor: Anchor,
  certainty: Certainty,
  status: ItemStatus,
  window_open: z.iso.date(),
  deadline: z
    .object({
      date: z.iso.date(),
      kind: DeadlineKind,
      note_en: z.string().optional(),
    })
    .optional(),
  /** Whole days from today to the deadline. Negative once overdue. */
  days_until_deadline: z.number().int().optional(),
  authority_en: z.string().min(1),
  /** Named authority for consular items, which have no authority_en equivalent. */
  authority_local: z.string().min(1).optional(),
  consequence_en: z.string().min(1),
  documents: z.array(z.string().min(1)),
  source_ref: z.string().min(1),
  source_url: z.string().min(1),
  /** null means nobody has checked this source yet. Never a guess. */
  verified_on: z.iso.date().nullable(),
  source_status: SourceStatus.optional(),
  review_after: z.iso.date(),
});

export type TimelineItem = z.infer<typeof TimelineItem>;

/**
 * A span, not a row. Mutterschutz is a protection period the UI renders as a band
 * across the timeline (MuSchG §3), so it is deliberately a different type from
 * TimelineItem and deliberately not a thirteenth rule.
 */
export const TimelinePeriod = z.object({
  id: z.literal("mutterschutz"),
  start: z.iso.date(),
  end: z.iso.date(),
  /** 8 normally, 12 when premature, multiple, or a disability is determined. */
  weeks_after: z.union([z.literal(8), z.literal(12)]),
  premature: z.boolean(),
  certainty: Certainty,
});

export type TimelinePeriod = z.infer<typeof TimelinePeriod>;

/**
 * The wire contract of GET/POST /api/timeline.
 *
 * Phase 6 put an HTTP seam between the engine and the screen (ADR-069): the
 * rules live on disk so `buildTimeline` is server-only, while the profile lives
 * in localStorage and is therefore client-only. Those two cannot meet in a
 * Server Component.
 *
 * This is validated on the way OUT as well as in. Once a date crosses a wire it
 * is a string in a JSON blob, and the screen renders whatever arrives; the
 * engine's internal `Timeline` type stops protecting anything at that boundary.
 * `tests/ui/timeline-rows.test.ts` also asserts that the engine's own output
 * satisfies this schema, so the two cannot drift apart silently.
 */
export const TimelineResponse = z.object({
  items: z.array(TimelineItem),
  period: TimelinePeriod,
  /** The date every status was derived against. Echoed so output is reproducible. */
  as_of: z.iso.date(),
});

export type TimelineResponse = z.infer<typeof TimelineResponse>;

/** One item whose date moved. Mirrors `DateChange` in lib/timeline/diff.ts. */
export const DateChangeWire = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  from: z.iso.date(),
  to: z.iso.date(),
});

export type DateChangeWire = z.infer<typeof DateChangeWire>;

/**
 * The wire contract of POST /api/birth-preview (ADR-070).
 *
 * F2b asks "what moves if the baby was born on this day?" and must answer it
 * WITHOUT committing anything. `computeDateChanges` runs on the server for the
 * same reason `buildTimeline` does (ADR-069): the rules are on disk, and a
 * second copy of the diff in the browser is the duplication this project
 * refuses.
 *
 * `period_before` and `period_after` carry the Mutterschutz period on both sides
 * so the screen can say whether the protection period after the birth changed —
 * which is the one consequence of an early birth that is not a moved date.
 */
export const BirthPreviewResponse = z.object({
  changes: z.array(DateChangeWire),
  period_before: TimelinePeriod,
  period_after: TimelinePeriod,
  /**
   * Whole days the birth precedes the due date; negative when it follows.
   * Computed by the engine so the screen never does date arithmetic.
   */
  days_early: z.number().int(),
  /** The threshold the engine uses for the twelve-week period. MuSchG §3(2). */
  premature_threshold_days: z.number().int(),
});

export type BirthPreviewResponse = z.infer<typeof BirthPreviewResponse>;

// ---------------------------------------------------------------------------
// Answer contract (consumed from Phase 3; defined here so the type is stable)
// ---------------------------------------------------------------------------

export const Citation = z.object({
  /** e.g. 'BEEG §7(1)'. Rendered in Plex Mono as the Aktenzeichen convention. */
  section_ref: z.string().min(1),
  source_url: z.string().min(1),
  /** When this source was last checked. Shown on every chip. */
  as_of: z.iso.date(),
  doc_title: z.string().min(1).optional(),
});

export type Citation = z.infer<typeof Citation>;

/**
 * Rule 8: the UI never renders an 'answered' response without at least one
 * citation. Enforced here with a non-empty tuple so a zero-citation answer
 * cannot be constructed, not merely discouraged.
 */
export const Answer = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("answered"),
    text: z.string().min(1),
    citations: z.array(Citation).nonempty(),
    /** e.g. 'This applies in Hessen'. design-system.md §5. */
    jurisdiction_scope: z.string().min(1),
    glossed_terms: z.array(z.object({ de: z.string(), en_gloss: z.string() })).default([]),
  }),
  z.object({
    kind: z.literal("deflected"),
    text: z.string().min(1),
    /** Why the guard fired. Never shown to the user; used by the eval harness. */
    reason: z.literal("medical"),
  }),
  z.object({
    kind: z.literal("refused"),
    text: z.string().min(1),
    /**
     * 'unavailable' is set only by our own fail-closed paths, never by the
     * model: lib/rag/generate.ts's Generated enum omits it, so a generation
     * outage can never masquerade as a judgement about the question. ADR-022.
     */
    reason: z.enum(["low_confidence", "out_of_scope", "individual_case", "unavailable"]),
  }),
]);

export type Answer = z.infer<typeof Answer>;
