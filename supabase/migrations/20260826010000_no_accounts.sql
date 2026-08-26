-- Email is optional now, because there are no accounts.
--
-- It was `not null` when it was the sign-in identity: every listing belonged
-- to the address that created it. Claiming a seat no longer involves signing
-- in, so the column is now just a contact address someone may leave to have a
-- lost manage link sent again -- and most people will not leave one.
--
-- Without this, every claim fails on a not-null violation the moment the
-- form stops supplying an address.
alter table listings alter column email drop not null;

-- owner_email is dead. Old rows keep whatever they had, so the archive and
-- anything looking at history stay intact; nothing writes it any more.
comment on column listings.owner_email is
  'Legacy: the account that created the listing, back when there were accounts. Not written any more.';
