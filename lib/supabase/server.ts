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
export async function matchChunks(args: MatchChunksArgs): Promise<ChunkHit[]> {
  const { data, error } = await serviceRoleClient().rpc("match_chunks", {
    query_embedding: JSON.stringify(args.queryEmbedding),
    query_text: args.queryText,
    filter_jurisdictions: args.filterJurisdictions,
    match_count: args.matchCount,
  });

  if (error) throw new Error(`match_chunks failed: ${error.message}`);
  return (data ?? []) as ChunkHit[];
}
