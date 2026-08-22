-- Ranking is earned, not bought.
--
-- Every listing pays the same flat monthly fee for a place on the board.
-- Position is decided by clicks delivered, so the front row goes to whatever
-- people actually want to click.
--
-- Score is clicks per active day rather than total clicks, so a listing that
-- joined yesterday can outrank one that joined last month. Ranking on raw
-- totals would make the board freeze: whoever arrived first would sit at the
-- front permanently, and nothing new could ever climb.

-- Column set changes, so CREATE OR REPLACE cannot be used here.
drop view if exists board;
create view board as
select
  l.id,
  l.slug,
  l.name,
  l.url,
  l.tagline,
  l.logo_url,
  l.category,
  l.price_cents,
  l.tier_since,
  l.status,
  l.created_at,
  coalesce(c.clicks_7d, 0)   as clicks_7d,
  coalesce(c.clicks_30d, 0)  as clicks_30d,
  coalesce(c.clicks_total, 0) as clicks_total,
  round(coalesce(c.clicks_7d, 0)::numeric / greatest(1, least(7,
    ceil(extract(epoch from (now() - l.created_at)) / 86400)
  )), 3) as score,
  row_number() over (
    order by
      -- Clicks per active day, capped at a seven-day window.
      coalesce(c.clicks_7d, 0)::numeric / greatest(1, least(7,
        ceil(extract(epoch from (now() - l.created_at)) / 86400)
      )) desc,
      coalesce(c.clicks_7d, 0) desc,
      -- Among listings with nothing to separate them, newest first: a stale
      -- zero-click listing should not outrank one that only just arrived.
      l.created_at desc,
      l.id asc
  ) as rank
from listings l
left join lateral (
  select
    count(*)                                                            as clicks_total,
    count(*) filter (where created_at > now() - interval '7 days')      as clicks_7d,
    count(*) filter (where created_at > now() - interval '30 days')     as clicks_30d
  from clicks where listing_id = l.id
) c on true
where l.status in ('active', 'past_due');

-- Placement is no longer a function of price, so activate_listing only needs
-- to switch a listing on and enforce the cap.
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
  perform pg_advisory_xact_lock(hashtext('seats_board'));

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

  -- Over capacity, the least-clicked listings drop out rather than the
  -- cheapest — the board is capped at 200 seats.
  update listings set
    status      = 'grace',
    grace_until = now() + interval '7 days',
    updated_at  = now()
  where id in (select id from board offset 200);

  select rank into v_rank from board where id = p_listing_id;
  return v_rank;
end;
$$;

grant select, insert, update, delete on all tables in schema public to service_role;
