-- More to say about a product.
--
-- Images stay as URLs rather than uploads: an upload path needs a storage
-- bucket, byte-level type checking and a cleanup job for orphaned files, and
-- none of that is worth carrying while a favicon fallback already covers the
-- common case.
--
-- Email is required on every listing. It is not used for anything today, but
-- it is the identity a magic-link sign-in will attach to, so collecting it
-- from the first listing onwards avoids having to chase people for it later.

-- Room to say more than a 160-character tagline allows.
alter table listings add column if not exists description text;

-- How the product is sold: free, freemium, paid, open source, trial.
alter table listings add column if not exists pricing_model text;

-- A second link — docs or pricing — stored in the existing extra_links shape.
