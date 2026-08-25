-- Anon held a SELECT grant on daily_ranks. Row-level security returned no
-- rows so nothing leaked, but the grant meant a single permissive policy
-- added later would have exposed the table. Everything is reached through
-- the service role, so anon needs nothing.
revoke all on all tables in schema public from anon, authenticated;
