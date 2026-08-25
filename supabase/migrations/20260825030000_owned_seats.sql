-- Seats are owned, not contested.
--
-- Whoever claims a seat keeps it. Order is the order people arrived, so seat
-- 1 belongs to whoever got there first and nothing anyone does later moves
-- them. Clicks are still counted and shown — they tell an owner what the
-- seat is worth — but they no longer decide position.

drop view if exists category_benchmark;
drop view if exists board cascade;

create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.tagline_b, l.logo_url, l.image_url,
  l.category, l.price_cents, l.extra_links, l.tier_since, l.status, l.created_at,
  coalesce(c.clicks_24h, 0)   as clicks_24h,
  coalesce(c.clicks_7d, 0)    as clicks_7d,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  0::numeric                  as score,
  -- Arrival order. id breaks the tie if two land in the same instant, so a
  -- seat number can never shift between two page loads.
  row_number() over (order by l.created_at asc, l.id asc) as rank
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
