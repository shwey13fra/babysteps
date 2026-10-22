-- 0004_or_tsquery.sql
-- The lexical half of match_chunks was returning nothing. Measured, not suspected.
--
-- 0002 builds its tsquery with websearch_to_tsquery('german', query_text), which joins
-- whitespace-separated terms with AND. lib/rag/expand.ts appends every expand_with term
-- from the glossary, so the conjunction becomes unsatisfiable and `fts @@ query` matches
-- zero rows. Measured against the live 141-chunk corpus on 2026-10-22:
--
--   query_text                                              rows with fts_pos
--   "Elterngeld"                                                    8
--   "Elterngeld rückwirkend"                                        1   <- BEEG §7 at fts rank 1
--   "Elterngeld rückwirkend Basiselterngeld"                        1
--   "...Elterngeld Basiselterngeld ElterngeldPlus Bezugszeitraum"   0   <- what expand.ts sends
--
-- With the full expansion BEEG §7 fell out of the top 3 entirely; without expansion it is
-- rank 1. The module whose purpose is to give the lexical half something to match was
-- making it match nothing, and RRF was fusing a working vector retriever with a dead one.
--
-- The AND also fails on plain multi-word German without any expansion at all
-- ("Kündigung schwanger" -> 0 fts rows), so this is not only an expansion problem.
--
-- Fix: keep websearch_to_tsquery for stemming, normalisation and escaping - it handles
-- German compounds and quoting correctly - then rewrite its top-level conjunctions as
-- disjunctions. Phrase operators (<->) and negation (!) survive the swap untouched.
-- ts_rank then orders the disjunction, which is what RRF expects to consume.

create or replace function or_tsquery(q text)
returns tsquery
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select case
    when coalesce(btrim(q), '') = '' then ''::tsquery
    else replace(websearch_to_tsquery('german', q)::text, '&', '|')::tsquery
  end;
$$;

revoke all on function or_tsquery(text) from public, anon, authenticated;

-- Same signature as 0002, so this replaces it in place. Only the two
-- websearch_to_tsquery call sites in the `kw` CTE change.
create or replace function match_chunks(
  query_embedding  vector(1024),
  query_text       text,
  filter_jurisdictions text[],
  match_count      int default 8,
  rrf_k            int default 60,
  candidate_pool   int default 50
)
returns table (
  id            bigint,
  content       text,
  section_ref   text,
  doc_title     text,
  source_url    text,
  valid_from    date,
  retrieved_at  timestamptz,
  corpus_version text,
  cosine        float,
  fts_rank      float,
  vec_pos       int,
  fts_pos       int,
  rrf           float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with vec as (
    select c.id,
           1 - (c.embedding <=> query_embedding) as cosine,
           row_number() over (order by c.embedding <=> query_embedding) as pos
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions)
    order by c.embedding <=> query_embedding
    limit candidate_pool
  ),
  kw as (
    select c.id,
           ts_rank(c.fts, or_tsquery(query_text)) as fts_rank,
           row_number() over (
             order by ts_rank(c.fts, or_tsquery(query_text)) desc
           ) as pos
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions)
      and c.fts @@ or_tsquery(query_text)
    limit candidate_pool
  ),
  fused as (
    select coalesce(v.id, k.id)                          as id,
           coalesce(v.cosine, 0)                         as cosine,
           coalesce(k.fts_rank, 0)                       as fts_rank,
           v.pos::int                                    as vec_pos,
           k.pos::int                                    as fts_pos,
           coalesce(1.0 / (rrf_k + v.pos), 0)
         + coalesce(1.0 / (rrf_k + k.pos), 0)            as rrf
    from vec v
    full outer join kw k on v.id = k.id
  )
  select c.id, c.content, c.section_ref, c.doc_title, c.source_url,
         c.valid_from, c.retrieved_at, c.corpus_version,
         f.cosine, f.fts_rank, f.vec_pos, f.fts_pos, f.rrf
  from fused f
  join corpus_chunks c on c.id = f.id
  order by f.rrf desc, f.cosine desc
  limit match_count;
$$;

revoke all on function match_chunks(vector, text, text[], int, int, int) from public, anon, authenticated;
grant execute on function match_chunks(vector, text, text[], int, int, int) to service_role;
