-- Abuse reports: the only way to flag a bad listing besides editing the
-- database by hand.
--
-- Reporting stays open — no sign-in required — because a scam listing does
-- its damage in the minutes right after it goes up, and requiring an account
-- first is exactly the friction that would let it sit there uncontested. The
-- guard against abusing the reports themselves lives in the API route (a
-- hashed-IP rate limit), plus one report per listing per IP enforced here so
-- a single visitor can't inflate a count by resubmitting.

create table if not exists reports (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references listings(id) on delete cascade,
  reason            text not null check (reason in ('spam', 'scam', 'broken', 'nsfw', 'other')),
  note              text check (note is null or length(note) <= 500),
  reporter_ip_hash  text not null,
  created_at        timestamptz not null default now()
);

create index if not exists reports_listing_idx on reports (listing_id);
create index if not exists reports_created_idx on reports (created_at desc);

-- Rate limiting reads "how many has this IP filed in the last hour",
-- regardless of listing.
create index if not exists reports_ip_created_idx on reports (reporter_ip_hash, created_at desc);

-- One report per listing per IP. Repeats from the same visitor don't add
-- signal, they just let one person inflate a listing's count.
create unique index if not exists reports_listing_ip_unique
  on reports (listing_id, reporter_ip_hash);

-- Same posture as every other table: no public access, everything goes
-- through the server on the service role.
alter table reports enable row level security;

grant select, insert, update, delete on all tables in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
