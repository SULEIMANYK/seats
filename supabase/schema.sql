-- frontrow.lol — schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- listings: one row per product on the board
-- ---------------------------------------------------------------------------
create table if not exists listings (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  url             text not null,
  tagline         text not null,
  logo_url        text,
  email           text not null,

  -- rank is derived from these two columns, never stored
  price_cents     integer not null,
  tier_since      timestamptz not null default clock_timestamp(),

  -- pending  : checkout started, not paid yet (invisible on the board)
  -- active   : paying, visible
  -- past_due : payment failing, still visible with a badge
  -- grace    : pushed off the board, 7 days to re-up
  -- canceled : gone
  status          text not null default 'pending'
                  check (status in ('pending','active','past_due','grace','canceled')),
  grace_until     timestamptz,
  -- set when Polar reports the subscription won't renew; the listing stays
  -- visible until the period actually ends
  cancel_scheduled boolean not null default false,

  -- secret link that lets the owner manage the listing without an auth system
  manage_token    uuid not null default gen_random_uuid(),

  polar_subscription_id text unique,
  polar_customer_id     text,
  polar_product_id      text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists listings_rank_idx
  on listings (price_cents desc, tier_since asc, id asc)
  where status in ('active','past_due');

create index if not exists listings_manage_token_idx on listings (manage_token);
create index if not exists listings_subscription_idx on listings (polar_subscription_id);

-- ---------------------------------------------------------------------------
-- clicks: one row per outbound click, powers the "was it worth it" numbers
-- ---------------------------------------------------------------------------
create table if not exists clicks (
  id          bigserial primary key,
  listing_id  uuid not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  ip_hash     text,
  referer     text,
  ua          text
);

create index if not exists clicks_listing_time_idx on clicks (listing_id, created_at desc);

-- ---------------------------------------------------------------------------
-- rank_events: audit trail, and the source for "you dropped to #14" emails
-- ---------------------------------------------------------------------------
create table if not exists rank_events (
  id          bigserial primary key,
  listing_id  uuid not null references listings(id) on delete cascade,
  kind        text not null,             -- joined | climbed | bumped | canceled
  from_cents  integer,
  to_cents    integer,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- board: the public view. Rank is computed here so it can never drift.
-- Ties break toward whoever reached the price first — rewards commitment.
-- ---------------------------------------------------------------------------
create or replace view board as
select
  l.id,
  l.slug,
  l.name,
  l.url,
  l.tagline,
  l.logo_url,
  l.price_cents,
  l.tier_since,
  l.status,
  l.created_at,
  -- `id` is the final tiebreaker: without it, two listings at the same price
  -- and same tier_since would sort arbitrarily and their ranks could swap
  -- between page loads.
  row_number() over (order by l.price_cents desc, l.tier_since asc, l.id asc) as rank,
  coalesce(c.clicks_30d, 0)   as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total
from listings l
left join lateral (
  select
    count(*)                                                          as clicks_total,
    count(*) filter (where created_at > now() - interval '30 days')   as clicks_30d
  from clicks where listing_id = l.id
) c on true
where l.status in ('active', 'past_due')
order by l.price_cents desc, l.tier_since asc, l.id asc;

-- ---------------------------------------------------------------------------
-- Atomically claim a slot. Returns the rank the listing landed at.
-- Runs inside the transaction so two people paying at once can't both
-- take #1 with the same amount.
-- ---------------------------------------------------------------------------
create or replace function activate_listing(
  p_listing_id uuid,
  p_price_cents integer,
  p_subscription_id text,
  p_customer_id text,
  p_product_id text
) returns integer
language plpgsql
as $$
declare
  v_rank integer;
begin
  perform pg_advisory_xact_lock(hashtext('frontrow_board'));

  update listings set
    status                = 'active',
    price_cents           = p_price_cents,
    tier_since            = clock_timestamp(),
    grace_until           = null,
    polar_subscription_id = p_subscription_id,
    polar_customer_id     = p_customer_id,
    polar_product_id      = p_product_id,
    updated_at            = now()
  where id = p_listing_id;

  -- Board is capped at 100. Anyone below the cut goes to a 7-day grace
  -- period rather than being deleted outright.
  update listings set
    status      = 'grace',
    grace_until = now() + interval '7 days',
    updated_at  = now()
  where id in (
    select id from listings
    where status in ('active','past_due')
    order by price_cents desc, tier_since asc, id asc
    offset 100
  );

  select rank into v_rank from board where id = p_listing_id;
  return v_rank;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: no public access at all. Every read and write goes through the
-- server using the service role key, so the anon key can't leak emails
-- or manage tokens even if it ends up in a browser.
-- ---------------------------------------------------------------------------
alter table listings   enable row level security;
alter table clicks     enable row level security;
alter table rank_events enable row level security;
