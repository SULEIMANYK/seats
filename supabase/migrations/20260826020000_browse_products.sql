-- One row per product for the Browse page.
--
-- Browse used to pull every listing (capped at 5000) and collapse them by
-- domain in JavaScript. That cannot be paginated: deduplicating by domain
-- needs the whole set, so page two would happily repeat a product that page
-- one had already shown under a different day's row.
--
-- Collapsing in the database instead makes each page self-consistent, and
-- lets the click tally be one grouped scan rather than a chunked in() loop.
create or replace view browse_products as
with live as (
  select *
  from listings
  where status in ('active', 'past_due')
),
latest as (
  -- The most recent row a domain has, which is the version to display.
  select distinct on (domain)
    id, slug, name, url, domain, tagline, description,
    logo_url, image_url, category, pricing_model, extra_links,
    seat_day, created_at
  from live
  order by domain, seat_day desc nulls last, created_at desc
),
days as (
  select domain, count(*)::int as days_on_board
  from live
  group by domain
),
clicked as (
  select l.domain, count(c.listing_id)::int as clicks_total
  from live l
  left join clicks c on c.listing_id = l.id
  group by l.domain
)
select
  latest.*,
  days.days_on_board,
  coalesce(clicked.clicks_total, 0) as clicks_total
from latest
join days on days.domain = latest.domain
left join clicked on clicked.domain = latest.domain;

grant select on browse_products to service_role;
revoke all on browse_products from anon, authenticated;
