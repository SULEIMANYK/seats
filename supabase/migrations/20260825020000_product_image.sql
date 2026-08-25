-- An optional product screenshot.
--
-- Only the three front-row cards are large enough to show one; the seats
-- behind them stay logo-only, which is what keeps the chart readable.
alter table listings add column if not exists image_url text;
