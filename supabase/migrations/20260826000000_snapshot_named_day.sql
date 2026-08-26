-- Snapshot the day it is told to, not whatever day it happens to run on.
--
-- Two faults, and they compounded.
--
-- The function took a p_day argument but selected `from board`, and that view
-- is hardcoded to `seat_day = today`. So p_day only ever labelled the rows --
-- it never changed which day was read. Asking for yesterday wrote today's
-- board under yesterday's date.
--
-- The cron was scheduled at 23:50 to sit just inside the day it captures. But
-- this project is on Vercel's Hobby plan, where crons are triggered within the
-- hour of their scheduled time rather than at the minute. A run that landed
-- after midnight would default p_day to the new date, find a board that had
-- just been cleared, and record nothing -- losing the day that had just ended,
-- permanently and silently.
--
-- Now the day is read from `listings` directly, so any past day can be
-- captured, and the caller names it. The cron runs after midnight and asks for
-- yesterday, which is unambiguous anywhere in an hour-wide firing window.
create or replace function snapshot_board(p_day date default (now() at time zone 'utc')::date)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  delete from daily_ranks where day = p_day;

  insert into daily_ranks (day, listing_id, rank, clicks_24h, name, url, slug, category)
  select
    p_day,
    l.id,
    coalesce(l.seat, 9999),
    coalesce(c.clicks, 0),
    l.name,
    l.url,
    l.slug,
    l.category
  from listings l
  left join lateral (
    -- Clicks that landed on the day being captured, in UTC, rather than a
    -- rolling 24 hours from whenever the snapshot happens to run.
    select count(*) as clicks
    from clicks
    where listing_id = l.id
      and (created_at at time zone 'utc')::date = p_day
  ) c on true
  where l.seat_day = p_day
    and l.status in ('active', 'past_due');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function snapshot_board(date) to service_role;
