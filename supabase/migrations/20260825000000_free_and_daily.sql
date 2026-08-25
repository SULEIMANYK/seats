-- Free, and the board turns over every day.
--
-- Nothing is charged, so price no longer appears anywhere in ranking. Seats
-- are ordered by clicks earned in the last 24 hours: a good week holds
-- nothing, and the front row has to be won again each day. That is the whole
-- reason to come back and look.
--
-- A seven-day window smoothed the board into near-stillness — an early
-- winner would sit at the front for a week. Twenty-four hours is noisier,
-- which is the point.

alter table listings alter column price_cents set default 0;

drop view if exists category_benchmark;
drop view if exists board cascade;

create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.tagline_b, l.logo_url, l.category,
  l.price_cents, l.extra_links, l.tier_since, l.status, l.created_at,
  coalesce(c.clicks_24h, 0)   as clicks_24h,
  coalesce(c.clicks_7d, 0)    as clicks_7d,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  coalesce(c.clicks_24h, 0)::numeric as score,
  row_number() over (
    order by
      coalesce(c.clicks_24h, 0) desc,
      -- The week breaks ties on a quiet day rather than leaving order to chance.
      coalesce(c.clicks_7d, 0) desc,
      -- Then newest first, so a stale listing cannot outrank a fresh one.
      l.created_at desc,
      l.id asc
  ) as rank
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

drop view if exists trending;
create view trending as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.logo_url, l.category,
  coalesce(c.today, 0)      as clicks_this_week,
  coalesce(c.yesterday, 0)  as clicks_prev_week,
  l.created_at > now() - interval '24 hours' as is_new,
  case when coalesce(c.yesterday, 0) = 0 then null
       else round(((c.today - c.yesterday)::numeric / c.yesterday) * 100) end as change_pct
from listings l
left join lateral (
  select
    count(*) filter (where created_at > now() - interval '24 hours')      as today,
    count(*) filter (where created_at > now() - interval '48 hours'
                       and created_at <= now() - interval '24 hours')     as yesterday
  from clicks where listing_id = l.id
) c on true
where l.status in ('active', 'past_due')
order by coalesce(c.today, 0) desc;

grant select, insert, update, delete on all tables in schema public to service_role;
