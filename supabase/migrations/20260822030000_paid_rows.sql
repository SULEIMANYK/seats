-- Rank returns to price order.
--
-- Row prices decide placement again, so the board orders by what a listing
-- pays, earliest to reach a price sitting nearer the front of its row.
-- Clicks stay tracked and shown — they are what tells a subscriber whether
-- the seat is worth it — but they no longer move anyone.

-- category_benchmark and trending read from board, so they go too and are
-- recreated below.
drop view if exists category_benchmark;
drop view if exists board cascade;
create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.tagline_b, l.logo_url, l.category,
  l.price_cents, l.plan, l.extra_links, l.tier_since, l.status, l.created_at,
  coalesce(c.clicks_7d, 0)    as clicks_7d,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  0::numeric                  as score,
  row_number() over (
    order by l.price_cents desc, l.tier_since asc, l.id asc
  ) as rank
from listings l
left join lateral (
  select
    count(*)                                                        as clicks_total,
    count(*) filter (where created_at > now() - interval '7 days')  as clicks_7d,
    count(*) filter (where created_at > now() - interval '30 days') as clicks_30d
  from clicks where listing_id = l.id
) c on true
where l.status in ('active', 'past_due');

grant select, insert, update, delete on all tables in schema public to service_role;

create or replace view category_benchmark as
select
  b.id, b.category, b.clicks_7d, b.rank,
  rank() over (partition by b.category order by b.clicks_7d desc) as category_rank,
  count(*) over (partition by b.category)                          as category_size,
  round(avg(b.clicks_7d) over (partition by b.category), 1)        as category_avg_clicks
from board b;
