-- Leftovers from the removed payment system.
--
-- Six of the eight columns originally flagged for this cleanup are dropped
-- here: plan, tagline_b, cancel_scheduled, polar_subscription_id,
-- polar_customer_id, polar_product_id. Nothing in src/ reads or writes any
-- of them (tagline_b's only reader was the tagline_test view below, which
-- is itself unreachable in practice: it filters on `tagline_b is not null`,
-- and nothing has ever set tagline_b, so it always returned zero rows).
--
-- price_cents and grace_until are deliberately NOT dropped here, even
-- though they're just as dead conceptually:
--   - price_cents is still written on every insert — literally
--     `price_cents: 0` — in src/app/api/submit/route.ts and
--     src/app/api/reclaim/route.ts. Dropping the column makes those inserts
--     fail outright (unknown column), which breaks claiming or reclaiming a
--     seat — the site's core action.
--   - grace_until is still read in src/app/manage/[token]/page.tsx to
--     compute a "days left" figure. It's cosmetic dead weight (nothing sets
--     status = 'grace' anymore, so the banner that would show it can never
--     render), but the property is live TypeScript, not a stray reference.
-- Removing either column's field from the Listing type in src/lib/db.ts
-- would break `npx tsc --noEmit` on those two files, which this pass is not
-- permitted to touch. Left as a follow-up once those call sites are updated
-- alongside the schema.

drop view if exists tagline_test;
drop view if exists category_benchmark;
drop view if exists board cascade;

alter table listings drop column if exists plan;
alter table listings drop column if exists tagline_b;
alter table listings drop column if exists cancel_scheduled;
alter table listings drop column if exists polar_subscription_id;
alter table listings drop column if exists polar_customer_id;
alter table listings drop column if exists polar_product_id;

-- Recreated exactly as before, minus l.tagline_b.
create view board as
select
  l.id, l.slug, l.name, l.url, l.tagline, l.logo_url, l.image_url,
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
where l.status in ('active', 'past_due')
  and l.seat_day = (now() at time zone 'utc')::date;

-- Unchanged — it never referenced a dropped column, but depended on `board`
-- and so was cascade-dropped along with it.
create or replace view category_benchmark as
select
  b.id, b.category, b.clicks_24h, b.clicks_7d, b.rank,
  rank() over (partition by b.category order by b.clicks_24h desc) as category_rank,
  count(*) over (partition by b.category)                          as category_size,
  round(avg(b.clicks_24h) over (partition by b.category), 1)       as category_avg_clicks
from board b;

grant select, insert, update, delete on all tables in schema public to service_role;
