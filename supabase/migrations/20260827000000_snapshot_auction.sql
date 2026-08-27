-- Snapshot the auction, not the seating chart.
--
-- snapshot_board still read `coalesce(seat, 9999)` from the seats model, so
-- last night it recorded #1 postclay / #7 PlainDMARC while the live board
-- said #1 PlainDMARC / #2 postclay. An archive that contradicts the board is
-- worse than no archive: it is the record people would cite.
--
-- Ranks are now taken from the same ordering the leaderboard uses -- what a
-- listing has paid, oldest bid winning a tie -- computed as of the snapshot
-- rather than read from a column, because rank is derived everywhere else too.
create or replace function snapshot_board(p_day date default (now() at time zone 'utc')::date)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  delete from daily_ranks where day = p_day;

  insert into daily_ranks (day, listing_id, rank, clicks_24h, name, url, slug, category)
  select
    p_day,
    r.id,
    r.rnk,
    r.clicks,
    r.name,
    r.url,
    r.slug,
    r.category
  from (
    select
      l.id, l.name, l.url, l.slug, l.category,
      row_number() over (order by l.bid_cents desc, l.bid_at asc nulls last, l.id) as rnk,
      coalesce((
        select count(*) from clicks c
        where c.listing_id = l.id
          and (c.created_at at time zone 'utc')::date = p_day
      ), 0) as clicks
    from listings l
    where l.status in ('active', 'past_due')
      and l.bid_cents > 0
  ) r;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function snapshot_board(date) to service_role;
