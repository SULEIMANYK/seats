-- The board becomes an auction.
--
-- Rank is not stored. It is derived from what a listing has paid, so there is
-- exactly one source of truth and no way for a stored rank to drift out of
-- agreement with the money. Bid higher than the listing above you and you
-- pass it; everything below shifts down on its own.
--
-- The seat columns stay for now rather than being dropped: the archive and
-- the click history reference these rows, and a column that is merely unused
-- costs nothing next to losing what people already did here.
alter table listings add column if not exists bid_cents integer not null default 0;
alter table listings add column if not exists bid_at timestamptz;

create index if not exists listings_bid_idx
  on listings (bid_cents desc, bid_at asc)
  where status in ('active', 'past_due');

-- Every bid ever placed, whether or not it still holds a rank. This is the
-- activity feed, and the audit trail for money taken.
create table if not exists bids (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  payment_id   text unique,
  rank_after   integer,
  created_at   timestamptz not null default now()
);

create index if not exists bids_recent_idx on bids (created_at desc);
alter table bids enable row level security;
grant select, insert, update, delete on bids to service_role;
revoke all on bids from anon, authenticated;

-- The leaderboard. row_number over the paid amount, oldest bid winning a tie
-- so that arriving first is worth something when two people pay the same.
create or replace view leaderboard as
select
  l.id, l.slug, l.name, l.url, l.domain, l.tagline, l.logo_url, l.image_url,
  l.description, l.category, l.pricing_model, l.bid_cents, l.bid_at, l.created_at,
  row_number() over (order by l.bid_cents desc, l.bid_at asc nulls last, l.id) as rank,
  coalesce(c.clicks_total, 0) as clicks_total,
  coalesce(c.clicks_24h, 0)   as clicks_24h,
  (f.domain is not null)      as is_featured
from listings l
left join lateral (
  select
    count(*) as clicks_total,
    count(*) filter (where created_at > now() - interval '24 hours') as clicks_24h
  from clicks where listing_id = l.id
) c on true
left join featured f on f.domain = l.domain
where l.status in ('active', 'past_due')
  and l.bid_cents > 0;

-- The same board scored on the last 24 hours, for the "Today" toggle.
create or replace view leaderboard_today as
select
  l.id, l.slug, l.name, l.url, l.domain, l.tagline, l.logo_url, l.image_url,
  l.description, l.category, l.pricing_model, l.bid_cents, l.bid_at, l.created_at,
  row_number() over (order by coalesce(t.paid_24h, 0) desc, l.bid_at asc nulls last, l.id) as rank,
  coalesce(c.clicks_total, 0) as clicks_total,
  coalesce(c.clicks_24h, 0)   as clicks_24h,
  (f.domain is not null)      as is_featured,
  coalesce(t.paid_24h, 0)     as paid_24h
from listings l
left join lateral (
  select sum(amount_cents)::int as paid_24h
  from bids
  where listing_id = l.id and created_at > now() - interval '24 hours'
) t on true
left join lateral (
  select
    count(*) as clicks_total,
    count(*) filter (where created_at > now() - interval '24 hours') as clicks_24h
  from clicks where listing_id = l.id
) c on true
left join featured f on f.domain = l.domain
where l.status in ('active', 'past_due')
  and coalesce(t.paid_24h, 0) > 0;

grant select on leaderboard, leaderboard_today to service_role;
revoke all on leaderboard, leaderboard_today from anon, authenticated;
