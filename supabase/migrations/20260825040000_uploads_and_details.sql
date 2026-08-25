-- Uploaded images, and more to say about a product.
--
-- Images live in a public Supabase Storage bucket rather than being linked
-- from wherever the submitter happened to host them: a linked image can
-- change or vanish after review, and every visitor's request would leak to a
-- third party. Two megabytes is enough for a logo or a screenshot and small
-- enough that nobody can park a video here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 2097152,
        array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif'])
on conflict (id) do nothing;

-- Room to say more than a 160-character tagline allows.
alter table listings add column if not exists description text;
-- How the product is sold: free, freemium, paid, open-source.
alter table listings add column if not exists pricing_model text;
-- Docs, pricing, repo — [{"label":"Docs","url":"https://..."}]
-- extra_links already exists.
