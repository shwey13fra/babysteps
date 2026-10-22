-- 0003_service_role_grants.sql
-- Brief §3 enables RLS and grants nothing to anyone, including service_role. RLS bypass
-- (service_role has BYPASSRLS) is not the same as holding table privileges, so after 0001
-- the ingestion path could not insert and match_chunks could not be executed at all:
--   permission denied for table corpus_chunks   (42501, even with the service-role key)
--   permission denied for function match_chunks (42501)
-- This grants the server-side role exactly what the brief's architecture requires, and
-- nothing to anon or authenticated.

grant usage on schema public to service_role;

-- Ingestion writes and replaces corpus rows; the eval harness appends runs.
grant select, insert, update, delete on public.corpus_chunks          to service_role;
grant select, insert                 on public.eval_runs              to service_role;
grant select, insert, update, delete on public.reminder_subscriptions to service_role;

-- The RRF retrieval RPC from 0002. security definer, so it runs as owner once executable.
grant execute on function public.match_chunks(vector, text, text[], int, int, int) to service_role;

-- Belt and braces: the anon and authenticated roles get nothing, ever. These revokes are
-- no-ops against the current state and exist so a future default-privilege change cannot
-- silently open the corpus to the client-side key.
revoke all on public.corpus_chunks          from anon, authenticated;
revoke all on public.eval_runs              from anon, authenticated;
revoke all on public.reminder_subscriptions from anon, authenticated;
revoke execute on function public.match_chunks(vector, text, text[], int, int, int) from public, anon, authenticated;
