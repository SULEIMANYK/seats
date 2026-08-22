-- Three plans. Position is still earned by clicks in every one of them —
-- what money buys is instruments, not rank.
--
--   listed  $19   a seat, click tracking, public stats
--   pro     $49   + UTM tagging, weekly report, benchmarking, tagline A/B test
--   growth  $149  + dofollow link, embeddable badge, API access, extra links

alter table listings add column if not exists plan text not null default 'listed'
  check (plan in ('listed', 'pro', 'growth'));

-- Second tagline for the A/B test. Null means the listing isn't testing.
alter table listings add column if not exists tagline_b text;

-- Extra links for growth: [{"label":"Docs","url":"https://..."}]
alter table listings add column if not exists extra_links jsonb not null default '[]'::jsonb;

-- Which tagline was on screen when a click happened, so the test can be scored.
alter table clicks add column if not exists variant text
  check (variant is null or variant in ('a', 'b'));

create index if not exists clicks_variant_idx on clicks (listing_id, variant);

drop view if exists board;
create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.tagline_b, l.logo_url, l.category,
  l.price_cents, l.plan, l.extra_links, l.tier_since, l.status, l.created_at,
  coalesce(c.clicks_7d, 0)    as clicks_7d,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  round(coalesce(c.clicks_7d, 0)::numeric / greatest(1, least(7,
    ceil(extract(epoch from (now() - l.created_at)) / 86400))), 3) as score,
  row_number() over (
    order by
      coalesce(c.clicks_7d, 0)::numeric / greatest(1, least(7,
        ceil(extract(epoch from (now() - l.created_at)) / 86400))) desc,
      coalesce(c.clicks_7d, 0) desc,
      l.created_at desc,
      l.id asc
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

-- ---------------------------------------------------------------------------
-- Benchmarking, which is what a Pro subscriber is actually buying: not raw
-- clicks but whether they are beating their category.
-- ---------------------------------------------------------------------------
create or replace view category_benchmark as
select
  b.id,
  b.category,
  b.clicks_7d,
  b.rank,
  rank() over (partition by b.category order by b.clicks_7d desc) as category_rank,
  count(*) over (partition by b.category)                          as category_size,
  round(avg(b.clicks_7d) over (partition by b.category), 1)        as category_avg_clicks
from board b;

-- ---------------------------------------------------------------------------
-- A/B results per listing.
-- ---------------------------------------------------------------------------
create or replace view tagline_test as
select
  l.id,
  l.tagline    as variant_a,
  l.tagline_b  as variant_b,
  count(*) filter (where c.variant = 'a') as clicks_a,
  count(*) filter (where c.variant = 'b') as clicks_b
from listings l
left join clicks c on c.listing_id = l.id
where l.tagline_b is not null
group by l.id, l.tagline, l.tagline_b;

grant select, insert, update, delete on all tables in schema public to service_role;
