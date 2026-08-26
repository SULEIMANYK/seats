-- Paid placement, on the directory only.
--
-- Keyed by domain rather than listing id on purpose. A listing is recreated
-- every day the board clears, so a row id is good for about a day; the thing
-- someone is actually paying for outlives that. Browse already collapses by
-- domain, so this is the same unit that page is built around.
--
-- Nothing here touches the board. The fifty seats stay free and first-come,
-- which is the mechanic the whole site rests on -- selling position there
-- would be selling the one thing that makes it worth looking at.
create table if not exists featured (
  domain        text primary key,
  payment_id    text unique,
  amount_cents  integer,
  currency      text,
  email         text,
  created_at    timestamptz not null default now()
);

alter table featured enable row level security;
grant select, insert, update, delete on featured to service_role;
revoke all on featured from anon, authenticated;

-- Rebuilt to carry the flag. Featured products sort first; everything else
-- keeps the existing most-recent-first order.
create or replace view browse_products as
with live as (
  select * from listings where status in ('active', 'past_due')
),
latest as (
  select distinct on (domain)
    id, slug, name, url, domain, tagline, description,
    logo_url, image_url, category, pricing_model, extra_links,
    seat_day, created_at
  from live
  order by domain, seat_day desc nulls last, created_at desc
),
days as (
  select domain, count(*)::int as days_on_board from live group by domain
),
clicked as (
  select l.domain, count(c.listing_id)::int as clicks_total
  from live l left join clicks c on c.listing_id = l.id
  group by l.domain
)
select
  latest.*,
  days.days_on_board,
  coalesce(clicked.clicks_total, 0) as clicks_total,
  (f.domain is not null) as is_featured
from latest
join days on days.domain = latest.domain
left join clicked on clicked.domain = latest.domain
left join featured f on f.domain = latest.domain;

grant select on browse_products to service_role;
revoke all on browse_products from anon, authenticated;
