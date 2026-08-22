-- Visits, categories and trending.
--
-- A buyer deciding whether a seat is worth the money needs two numbers: how
-- much traffic the board gets, and how much of it reached them. Clicks were
-- already tracked; visits were not, so nobody could see the first number.

-- ---------------------------------------------------------------------------
-- Categories. Kept as a text column with a checked list rather than a lookup
-- table — the set changes rarely and joining a table of twenty rows to every
-- board query buys nothing.
-- ---------------------------------------------------------------------------
alter table listings add column if not exists category text;

create index if not exists listings_category_idx
  on listings (category)
  where status in ('active', 'past_due');

-- ---------------------------------------------------------------------------
-- Visits: one row per page view. Same shape as clicks so the two can be
-- compared directly, and the same hashed-IP treatment so no raw address is
-- ever stored.
-- ---------------------------------------------------------------------------
create table if not exists visits (
  id          bigserial primary key,
  path        text not null,
  created_at  timestamptz not null default now(),
  ip_hash     text,
  referer     text
);

create index if not exists visits_time_idx on visits (created_at desc);
create index if not exists visits_unique_idx on visits (ip_hash, created_at desc);

alter table visits enable row level security;

-- ---------------------------------------------------------------------------
-- Board stats: the headline numbers, in one round trip.
-- ---------------------------------------------------------------------------
create or replace view board_stats as
select
  (select count(*) from visits)                                                  as visits_total,
  (select count(*) from visits where created_at > now() - interval '24 hours')   as visits_24h,
  (select count(distinct ip_hash) from visits
     where created_at > now() - interval '24 hours')                             as visitors_24h,
  (select count(*) from clicks)                                                  as clicks_total,
  (select count(*) from clicks where created_at > now() - interval '24 hours')   as clicks_24h,
  (select count(*) from listings where status in ('active','past_due'))          as seats_taken,
  (select coalesce(sum(price_cents), 0) from listings
     where status in ('active','past_due'))                                      as mrr_cents;

-- ---------------------------------------------------------------------------
-- Trending: clicks this week against the week before.
--
-- Listings younger than a week have no prior week to compare against, so they
-- are reported as new rather than as infinite growth.
-- ---------------------------------------------------------------------------
create or replace view trending as
select
  l.id,
  l.slug,
  l.name,
  l.url,
  l.tagline,
  l.logo_url,
  l.category,
  l.price_cents,
  coalesce(c.this_week, 0)  as clicks_this_week,
  coalesce(c.prev_week, 0)  as clicks_prev_week,
  l.created_at > now() - interval '7 days' as is_new,
  case
    when coalesce(c.prev_week, 0) = 0 then null
    else round(((c.this_week - c.prev_week)::numeric / c.prev_week) * 100)
  end as change_pct
from listings l
left join lateral (
  select
    count(*) filter (where created_at > now() - interval '7 days')            as this_week,
    count(*) filter (where created_at > now() - interval '14 days'
                       and created_at <= now() - interval '7 days')           as prev_week
  from clicks where listing_id = l.id
) c on true
where l.status in ('active', 'past_due')
order by coalesce(c.this_week, 0) desc;

-- ---------------------------------------------------------------------------
-- Category rollup, for the filter chips and the stats page.
-- ---------------------------------------------------------------------------
create or replace view category_stats as
select
  coalesce(l.category, 'Uncategorised')                                as category,
  count(*)                                                             as seats,
  coalesce(sum(l.price_cents), 0)                                      as mrr_cents,
  coalesce(sum(c.clicks_30d), 0)                                       as clicks_30d
from listings l
left join lateral (
  select count(*) as clicks_30d
  from clicks
  where listing_id = l.id and created_at > now() - interval '30 days'
) c on true
where l.status in ('active', 'past_due')
group by coalesce(l.category, 'Uncategorised')
order by count(*) desc;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
