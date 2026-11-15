// lib/supabase/server.ts
//
// The service-role client and the one RPC the answer path needs.
//
// SERVER ONLY. The service-role key bypasses RLS, and RLS is the only thing
// standing between the corpus and the public internet (brief §4, CLAUDE.md
// rule 7). This module must never be imported from a client component or from
// anything reachable by the client bundle. The gate in the playbook greps for
// it; the throw below catches the case the grep would miss.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Mirrors the return shape of match_chunks as of migration 0005. */
export type ChunkHit = {
  id: number;
  content: string;
  /** Null on guidance chunks: only statute carries a § reference. */
  section_ref: string | null;
  doc_title: string | null;
  source_url: string;
  valid_from: string | null;
  /** When this source was last fetched. Becomes Citation.as_of. */
  retrieved_at: string;
  corpus_version: string;
  /** The refusal signal. Comparable across queries; rrf is not (ADR-008). */
  cosine: number;
  fts_rank: number;
  /** Rank in the vector retriever, null if it did not surface there. */
  vec_pos: number | null;
  /** Rank in the lexical retriever, null if it did not surface there. */
  fts_pos: number | null;
  /** Fused score. Ordering only — never threshold on this. */
  rrf: number;
};

export type MatchChunksArgs = {
  /** Embedding of the ORIGINAL question, never the expanded string. */
  queryEmbedding: number[];
  /** The German-expanded string from lib/rag/expand.ts. */
  queryText: string;
  filterJurisdictions: string[];
  matchCount: number;
};

export type SiblingsArgs = {
  /** Distinct non-null section_refs among the ranked hits. */
  sectionRefs: string[];
  /**
   * The SAME jurisdictions the ranked query used. Completion is retrieval, so
   * ADR-011 binds it exactly as it binds match_chunks: a Hessen family must not
   * be shown a Berlin procedure because it happened to share a § with a hit.
   */
  filterJurisdictions: string[];
};

let cached: SupabaseClient | null = null;

/**
 * Lazy on purpose: the env vars are read at call time, not at module load, so
 * importing this module from a script that populates process.env itself works
 * the same as importing it from a Next route.
 */
export function serviceRoleClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("lib/supabase/server.ts reached the browser — service-role key must stay server-side");
  }
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * The hybrid retriever. Statute and guidance are ranked in separate pools and
 * fused, so adding guidance cannot crowd statute out of the results
 * (ADR-017 / migration 0005).
 */
/**
 * The database could not be REACHED - distinct from a query that reached it and
 * failed.
 *
 * Confirmed signature (2026-11-14, observed end to end): a paused Supabase
 * project has its subdomain removed from DNS, so the client fails at the
 * transport layer and never returns an HTTP status. ADR-076.
 *
 * `observed` carries the raw text, because NXDOMAIN cannot distinguish a paused
 * project from a deleted one. The log says what was seen; it does not claim to
 * know which (ADR-067: four causes must not print one line).
 */
export class DatabaseUnreachableError extends Error {
  readonly observed: string;
  constructor(observed: string) {
    super(`database unreachable: ${observed}`);
    this.name = "DatabaseUnreachableError";
    this.observed = observed;
  }
}

/** Transport-level failure text, kept wide: any unreachability, not only DNS. */
const UNREACHABLE_SIGNATURES = [
  "fetch failed",
  "failed to fetch",
  "enotfound",
  "getaddrinfo",
  "eai_again",
  "econnrefused",
  "econnreset",
  "etimedout",
  "network error",
  "socket hang up",
];

/**
 * Whether an error from THE SUPABASE CLIENT means the database was unreachable.
 *
 * SCOPE, and it is the whole safety argument: this may only ever be applied to
 * an error produced by the Supabase client, which is why it lives in this file
 * and is called from nowhere else.
 *
 * At string level these signatures are INDISTINGUISHABLE from an OpenAI or
 * Anthropic transport failure - `embedQuestion` (lib/rag/retrieve.ts) calls
 * OpenAI with a raw fetch and throws the identical `TypeError: fetch failed`,
 * inside the same retrieve() call that /api/ask wraps. Matching these strings
 * anywhere else would therefore report "database unreachable" for a model
 * outage: ADR-067's swallowed-error defect in a new costume.
 *
 * What keeps the two apart is structural, not textual. This predicate is only
 * reached via the Supabase wrappers below, and the route branches on
 * `instanceof DatabaseUnreachableError` rather than on any string. A model or
 * embedding failure throws a plain Error and falls through to the ordinary
 * `unavailable` refusal. ADR-076.
 *
 * Deliberately does NOT match a query that arrived: permission denied, a
 * missing relation, a bad column. Those reached the database.
 */
export function isUnreachableError(err: unknown): boolean {
  const text = (
    err instanceof Error
      ? `${err.message} ${(err as { code?: string }).code ?? ""}`
      : typeof err === "object" && err !== null
        ? `${(err as { message?: string }).message ?? ""} ${(err as { code?: string }).code ?? ""}`
        : String(err ?? "")
  ).toLowerCase();
  if (!text.trim()) return false;
  return UNREACHABLE_SIGNATURES.some((sig) => text.includes(sig));
}

export async function matchChunks(args: MatchChunksArgs): Promise<ChunkHit[]> {
  // The client returns transport failures as `error` in some versions and
  // throws them in others, so both shapes are handled. Nothing here changes the
  // success path: every added line runs only once something has already failed.
  let data: unknown;
  let error: { message: string } | null;
  try {
    ({ data, error } = await serviceRoleClient().rpc("match_chunks", {
      query_embedding: JSON.stringify(args.queryEmbedding),
      query_text: args.queryText,
      filter_jurisdictions: args.filterJurisdictions,
      match_count: args.matchCount,
    }));
  } catch (thrown) {
    if (isUnreachableError(thrown)) {
      throw new DatabaseUnreachableError(thrown instanceof Error ? thrown.message : String(thrown));
    }
    throw thrown;
  }

  if (error) {
    if (isUnreachableError(error)) throw new DatabaseUnreachableError(error.message);
    throw new Error(`match_chunks failed: ${error.message}`);
  }
  return (data ?? []) as ChunkHit[];
}

/**
 * Every chunk belonging to the given §§, for section completion (ADR-032).
 *
 * A plain table read, not the RPC: these rows are not ranked and must never be
 * scored. The retriever signals are therefore returned as zero/null rather than
 * invented — `cosine: 0` on a sibling is what keeps the ADR-009 refusal
 * threshold reading the ranked list only, since it takes a maximum.
 *
 * Ordered by id ascending, which the chunker's output makes equal to document
 * order WITHIN a contiguous run. Callers must not assume it across a gap: three
 * Kinder-RL §§ carry a mislabelled stray chunk, verified 2026-10-29, and the
 * contiguity rule in lib/rag/retrieve.ts is what makes that harmless.
 */
export async function siblingsFor(args: SiblingsArgs): Promise<ChunkHit[]> {
  if (args.sectionRefs.length === 0) return [];

  const { data, error } = await serviceRoleClient()
    .from("corpus_chunks")
    .select(
      "id, content, section_ref, doc_title, source_url, valid_from, retrieved_at, corpus_version",
    )
    .in("section_ref", args.sectionRefs)
    .in("jurisdiction", args.filterJurisdictions)
    .order("id", { ascending: true });

  if (error) {
    if (isUnreachableError(error)) throw new DatabaseUnreachableError(error.message);
    throw new Error(`siblingsFor failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...(row as Omit<ChunkHit, "cosine" | "fts_rank" | "vec_pos" | "fts_pos" | "rrf">),
    cosine: 0,
    fts_rank: 0,
    vec_pos: null,
    fts_pos: null,
    rrf: 0,
  }));
}
