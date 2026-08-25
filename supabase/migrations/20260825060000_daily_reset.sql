-- Seats last a day.
--
-- Rather than a job that wipes the board at midnight, the claim itself
-- carries the day it was made for. A listing is on the board when its
-- seat_day is today, so the house empties on its own as the date rolls over
-- — nothing to schedule, nothing to fail, and no window where a wipe has
-- half finished.
--
-- The listing itself survives. Claiming again tomorrow reuses the product
-- details rather than making someone retype them.

alter table listings add column if not exists seat_day date;

-- Backfill so anything currently on the board stays there today.
update listings set seat_day = (now() at time zone 'utc')::date
where seat_day is null and status in ('active', 'past_due');

-- One listing per seat per day. Yesterday's holder does not block today's.
drop index if exists listings_seat_unique;
create unique index if not exists listings_seat_day_unique
  on listings (seat, seat_day)
  where status in ('active', 'past_due') and seat is not null;

drop view if exists category_benchmark;
drop view if exists board cascade;

create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.tagline_b, l.logo_url, l.image_url,
  l.description, l.pricing_model, l.category, l.price_cents, l.extra_links,
  l.tier_since, l.status, l.created_at, l.seat_day,
  coalesce(c.clicks_24h, 0)   as clicks_24h,
  coalesce(c.clicks_7d, 0)    as clicks_7d,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  0::numeric                  as score,
  coalesce(l.seat, 9999)      as rank
from listings l
left join lateral (
  select
    count(*)                                                          as clicks_total,
    count(*) filter (where created_at > now() - interval '24 hours')  as clicks_24h,
    count(*) filter (where created_at > now() - interval '7 days')    as clicks_7d,
    count(*) filter (where created_at > now() - interval '30 days')   as clicks_30d
  from clicks where listing_id = l.id
) c on true
-- Today only. This one clause is the entire reset.
where l.status in ('active', 'past_due')
  and l.seat_day = (now() at time zone 'utc')::date;

create or replace view category_benchmark as
select
  b.id, b.category, b.clicks_24h, b.clicks_7d, b.rank,
  rank() over (partition by b.category order by b.clicks_24h desc) as category_rank,
  count(*) over (partition by b.category)                          as category_size,
  round(avg(b.clicks_24h) over (partition by b.category), 1)       as category_avg_clicks
from board b;

grant select, insert, update, delete on all tables in schema public to service_role;
