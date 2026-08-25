-- You get the seat you clicked.
--
-- Seat number was derived from arrival order, so clicking an empty seat 3
-- and landing in seat 1 was the honest outcome of a dishonest interface: the
-- chart offered a choice the model could not keep. The seat is now stored,
-- and picking one on the chart claims that one.

alter table listings add column if not exists seat integer;

-- Two people claiming the same seat at once must not both succeed. The
-- partial index is the guard — the loser gets a unique violation and is told
-- the seat went.
create unique index if not exists listings_seat_unique
  on listings (seat)
  where status in ('active', 'past_due') and seat is not null;

-- Existing listings keep the position they already had on the board.
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as n
  from listings where status in ('active', 'past_due')
)
update listings l set seat = o.n from ordered o where l.id = o.id and l.seat is null;

drop view if exists category_benchmark;
drop view if exists board cascade;

create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.tagline_b, l.logo_url, l.image_url,
  l.description, l.pricing_model, l.category, l.price_cents, l.extra_links,
  l.tier_since, l.status, l.created_at,
  coalesce(c.clicks_24h, 0)   as clicks_24h,
  coalesce(c.clicks_7d, 0)    as clicks_7d,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  0::numeric                  as score,
  -- The seat someone actually claimed. Older rows without one fall to the
  -- back rather than colliding at seat 1.
  coalesce(l.seat, 9999) as rank
from listings l
left join lateral (
  select
    count(*)                                                          as clicks_total,
    count(*) filter (where created_at > now() - interval '24 hours')  as clicks_24h,
    count(*) filter (where created_at > now() - interval '7 days')    as clicks_7d,
    count(*) filter (where created_at > now() - interval '30 days')   as clicks_30d
  from clicks where listing_id = l.id
) c on true
where l.status in ('active', 'past_due');

create or replace view category_benchmark as
select
  b.id, b.category, b.clicks_24h, b.clicks_7d, b.rank,
  rank() over (partition by b.category order by b.clicks_24h desc) as category_rank,
  count(*) over (partition by b.category)                          as category_size,
  round(avg(b.clicks_24h) over (partition by b.category), 1)       as category_avg_clicks
from board b;

grant select, insert, update, delete on all tables in schema public to service_role;
