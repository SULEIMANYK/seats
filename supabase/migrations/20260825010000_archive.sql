-- Daily snapshots, so the board has a past.
--
-- Ranking now turns over every 24 hours, which makes "who held the front row
-- on a given day" a real fact worth keeping. Without a snapshot that history
-- is unrecoverable — clicks age out of the window and the ordering with them.

create table if not exists daily_ranks (
  day         date    not null,
  listing_id  uuid    not null references listings(id) on delete cascade,
  rank        integer not null,
  clicks_24h  integer not null,
  -- Name and url are copied rather than joined: a listing can be removed, and
  -- the archive should still show who actually held the seat that day.
  name        text    not null,
  url         text    not null,
  slug        text    not null,
  category    text,
  primary key (day, listing_id)
);

create index if not exists daily_ranks_day_idx on daily_ranks (day desc, rank asc);
create index if not exists daily_ranks_listing_idx on daily_ranks (listing_id, day desc);

alter table daily_ranks enable row level security;

-- One row per day per listing. Re-running on the same day overwrites, so a
-- retried cron cannot double-write or leave a half-finished day.
create or replace function snapshot_board(p_day date default (now() at time zone 'utc')::date)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  delete from daily_ranks where day = p_day;

  insert into daily_ranks (day, listing_id, rank, clicks_24h, name, url, slug, category)
  select p_day, b.id, b.rank, b.clicks_24h, b.name, b.url, b.slug, b.category
  from board b;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Days that have a snapshot, with the winner of each.
create or replace view archive_days as
select
  d.day,
  count(*)                                   as listings,
  sum(d.clicks_24h)                           as clicks,
  max(d.name) filter (where d.rank = 1)       as winner_name,
  max(d.slug) filter (where d.rank = 1)       as winner_slug,
  max(d.url)  filter (where d.rank = 1)       as winner_url,
  max(d.clicks_24h) filter (where d.rank = 1) as winner_clicks
from daily_ranks d
group by d.day
order by d.day desc;

grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
