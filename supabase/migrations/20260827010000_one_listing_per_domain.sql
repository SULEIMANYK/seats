-- One listing per domain, not one per domain per day.
--
-- The per-day rule belonged to a board that emptied every midnight: the same
-- product returning tomorrow was the whole point. An auction has no days, so
-- that rule would let a domain list again on a later date and appear twice on
-- the same leaderboard, holding two ranks.
--
-- Scoped to live listings, so a removed listing frees its domain to be
-- listed again rather than banning it forever.
drop index if exists listings_domain_day_unique;
drop index if exists listings_slug_day_unique;

create unique index if not exists listings_domain_live_unique
  on listings (domain)
  where status in ('active', 'past_due');

-- Slugs appear in URLs and on badges, so they have to be unique among live
-- listings for the same reason.
create unique index if not exists listings_slug_live_unique
  on listings (slug)
  where status in ('active', 'past_due');
